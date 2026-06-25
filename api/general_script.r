# Import libraries 
library(mirt) # This library contains the models to fit
library(DBI) # This is the database connection library (to Supabase)
library(RPostgres) # Library for connection object, queries, disconnect to Supabase 
library(dplyr) # Library for data wrangling 
library(tidyr) # Reshaping data long -> wide, cleaning 
library(jsonlite) # JSON parser library 
library(stringr) # Library for easier string manipulation
library(ggplot2) # Library for R visualizations 

# Connect to Supabase. Defaults target the local Supabase clone, but the API can
# override these values via environment variables when it runs this script.
db_name <- Sys.getenv("LATENT_TRAIT_DB_NAME", "postgres")
db_host <- Sys.getenv("LATENT_TRAIT_DB_HOST", "127.0.0.1")
db_port <- as.integer(Sys.getenv("LATENT_TRAIT_DB_PORT", "54322"))
db_user <- Sys.getenv("LATENT_TRAIT_DB_USER", "postgres")
db_password <- Sys.getenv("LATENT_TRAIT_DB_PASSWORD", "postgres")
api_mode <- tolower(Sys.getenv("LATENT_TRAIT_API_MODE", "false")) %in% c("1", "true", "yes")

con <- dbConnect( # Creates the connection object 
    RPostgres::Postgres(),
    dbname = db_name,
    host = db_host,
    port = db_port,
    user = db_user,
    password = db_password
)

# =========================
# 2. LOAD DATA
# =========================
# Load data from Supabase, assigns SQL query string to `query`
# `response_sessions` is the table in Supabase that contains 
# every response instance from any individual.
# `answers` is the table that contains every answer to any question
# in any survey. It may be answer_text, answer_numeric, or answer_options.
# This query is going to return every valid session's survey id, 
# question id, question type, question options, and every single answer 
# for all of those questions. 
query <- "
SELECT 
  rs.id AS session_id, 
  rs.survey_id, 
  q.id AS question_id, 
  q.question_text, 
  q.type AS question_type, 
  q.options AS question_options, 
  a.answer_text, 
  a.answer_numeric, 
  a.answer_options 
FROM response_sessions rs 
JOIN answers a ON rs.id = a.session_id 
JOIN questions q ON a.question_id = q.id
WHERE rs.is_valid = TRUE
"

# assign the response from the query via connection object to `raw`
raw <- dbGetQuery(con, query) 
dbDisconnect(con) # disconnect from db after use 

# =========================
# 3. CLEAN DUPLICATES (CRITICAL)
# =========================
# Cleaning duplicates via dplyr chained SQL function calls
# Keeps only one row for each unique (session_id, question_id) pair
# %>% is a "pipe", where the obj on left is passed as first argument to 
# function on the right 
raw <- raw %>% 
  distinct(session_id, question_id, .keep_all = TRUE)


# =========================
# 4. DEFINE LATENT TRAITS (SOURCE OF TRUTH)
# =========================
# Config architecture:
# - Each survey gets one JSON config in api/question_topic_configs.
# - LATENT_TRAIT_CONFIG_PATH can point to an explicit file.
# - LATENT_TRAIT_SURVEY_ID can select the config by survey_id.
# - If neither is provided, the script selects the one config whose survey_id
#   appears in the loaded valid response data.
config_dir <- Sys.getenv("LATENT_TRAIT_CONFIG_DIR", "api/question_topic_configs")
config_path <- Sys.getenv("LATENT_TRAIT_CONFIG_PATH", "")
config_survey_id <- Sys.getenv("LATENT_TRAIT_SURVEY_ID", "")

validate_latent_trait_config <- function(config, source_name) {
  if (is.null(config$survey_id) || !nzchar(config$survey_id)) {
    stop(paste0("Config ", source_name, " is missing survey_id"))
  }

  if (is.null(config$dimensions) || length(config$dimensions) == 0) {
    stop(paste0("Config ", source_name, " must define at least one dimension"))
  }

  if (is.null(names(config$dimensions)) || any(!nzchar(names(config$dimensions)))) {
    stop(paste0("Config ", source_name, " has unnamed dimensions"))
  }

  empty_dimensions <- names(config$dimensions)[lengths(config$dimensions) == 0]
  if (length(empty_dimensions) > 0) {
    stop(
      paste0(
        "Config ", source_name, " has empty dimensions: ",
        paste(empty_dimensions, collapse = ", ")
      )
    )
  }

  config
}

read_latent_trait_config <- function(path) {
  config <- jsonlite::fromJSON(path, simplifyVector = FALSE)
  config$source_file <- normalizePath(path, winslash = "/", mustWork = FALSE)
  validate_latent_trait_config(config, basename(path))
}

load_latent_trait_config <- function(config_dir, config_path, config_survey_id, raw_survey_ids) {
  if (nzchar(config_path)) {
    if (!file.exists(config_path)) {
      stop(paste0("LATENT_TRAIT_CONFIG_PATH does not exist: ", config_path))
    }

    return(read_latent_trait_config(config_path))
  }

  config_files <- list.files(config_dir, pattern = "\\.json$", full.names = TRUE)
  if (length(config_files) == 0) {
    stop(paste0("No latent trait config JSON files found in ", config_dir))
  }

  configs <- lapply(config_files, read_latent_trait_config)

  if (nzchar(config_survey_id)) {
    matches <- configs[vapply(configs, function(x) x$survey_id == config_survey_id, logical(1))]
    if (length(matches) != 1) {
      stop(paste0("Expected one config for survey_id ", config_survey_id, " but found ", length(matches)))
    }

    return(matches[[1]])
  }

  raw_survey_ids <- unique(as.character(raw_survey_ids))
  matches <- configs[vapply(configs, function(x) x$survey_id %in% raw_survey_ids, logical(1))]

  if (length(matches) != 1) {
    stop(
      paste0(
        "Could not infer exactly one latent trait config from response data. ",
        "Set LATENT_TRAIT_SURVEY_ID or LATENT_TRAIT_CONFIG_PATH. Matching configs: ",
        length(matches)
      )
    )
  }

  matches[[1]]
}

config <- load_latent_trait_config(
  config_dir = config_dir,
  config_path = config_path,
  config_survey_id = config_survey_id,
  raw_survey_ids = raw$survey_id
)

raw <- raw %>%
  filter(as.character(survey_id) == config$survey_id)

max_latent_traits <- as.integer(Sys.getenv("LATENT_TRAIT_MAX_DIMENSIONS", "3"))
if (is.na(max_latent_traits) || max_latent_traits < 1) {
  stop("LATENT_TRAIT_MAX_DIMENSIONS must be a positive integer")
}

# make a list of all of the latent traits being optimized for
all_dimensions <- names(config$dimensions)
dimensions <- head(all_dimensions, max_latent_traits)
if (length(all_dimensions) > length(dimensions)) {
  message(
    paste0(
      "Capping latent traits at ", max_latent_traits,
      ". Excluded dimensions from this fit: ",
      paste(setdiff(all_dimensions, dimensions), collapse = ", ")
    )
  )
}

selected_config_dimensions <- config$dimensions[dimensions]

# construct the question map 
question_map <- tibble::tibble(
  dimension = rep(
    dimensions,
    lengths(selected_config_dimensions)
  ),
  question_id = unlist(
    selected_config_dimensions,
    use.names = FALSE
  )
)

# Define the number of latent traits 
num_thetas <- length(dimensions)

# This is meant to remove duplicates in the question_map
# which is a tibble object that maps a partiuclar question
# to the theta dimension it is measuring 
question_map <- question_map %>% 
  distinct(question_id, dimension)


# =========================
# 5. JOIN + FILTER
# =========================
# Join and filter to attach the `question_map` dimensino metadata to `raw`
# Since there are questions (eg. section headers) in raw that aren't mapped to 
# at all, those are not included in the filter 
raw <- raw %>%
  left_join(question_map, by = "question_id") %>% 
  filter(!is.na(dimension))

# =========================
# 5b. RESPONSE METADATA HELPERS
# =========================
# Turns JSON string into R object
parse_json_value <- function(x) {
    # This will take in a JSON and check these bad cases
    if (is.null(x) || length(x) == 0 || all(is.na(x))) {
        return(NULL)
    }

    # uses jsonlite library to turn a JSON string into an R object
    if (is.character(x)) {
        return(fromJSON(x, simplifyVector = FALSE))
    }

    x
}

# Turns question_options JSON string into vector that R can use
get_question_choices <- function(question_options) {
    opts <- parse_json_value(question_options)

    if (is.null(opts)) { # If there are no options at all, return an empty character vector.
        return(character(0))
    }

    if (is.list(opts) && !is.null(opts$choices)) { # very specific JSON structure handling 
        return(as.character(opts$choices))
    }

    if (is.atomic(opts) || is.list(opts)) { # atomic, list 
        return(as.character(unlist(opts, use.names = FALSE)))
    }

    character(0) # return an empty vector if nothing else works
}

# Turns answer_options JSON string into vector that R can use
get_answer_options <- function(answer_options) {
    opts <- parse_json_value(answer_options)

    if (is.null(opts)) { # If no options, then return an empty vector
        return(character(0))
    }

    as.character(unlist(opts, use.names = FALSE))
}

# Create a unique ID for each checkbox inside a question so that each object can
# become its own binary item. Each checkbox item becomes its own column in the final
# matrix
make_checkbox_item_id <- function(question_id, option_index) {
    paste0(question_id, "__option_", option_index)
}

# IMPORTANT - CORE MAPPING - We pass in raw_data (a table), get the questions and question types
# and map them and return the data frame
build_analysis_rows <- function(raw_data) {
  session_ids <- raw_data$session_id # get session_id column 
  question_ids <- raw_data$question_id # get question_id column
  question_types <- as.character(raw_data$question_type) # get question_type column

  # all possible options per question
  # Applies get_question_choices to every row in question_options 
  # lapply gives you a list. We use list because we need to accomodate ragged structure
  # since each question can have a different number of options
  choices_list <- lapply(raw_data$question_options, get_question_choices)

  # how many options each question has
  # vapply gives you a vector with fixed type 
  option_counts <- vapply(choices_list, length, integer(1))

  # what each respondent actually chose
  selected_list <- lapply(raw_data$answer_options, get_answer_options)

  # logical vector where each entry says whether corresponding question needs options or not
  needs_choices <- question_types %in% c("checkboxes", "multiple_choice", "ranking")

  # indices of broken questions (need choices but have none)
  missing_choices <- which(needs_choices & option_counts == 0)

  if (length(missing_choices) > 0) {
    bad_row <- missing_choices[[1]]
    stop(
      paste0(
        "Question ", question_ids[[bad_row]],
        " has type ", question_types[[bad_row]],
        " but no metadata choices in questions.options"
      )
    )
  }

  # create logical vectors categorizing each of the questions
  is_checkboxes <- question_types == "checkboxes"
  is_multiple_choice <- question_types == "multiple_choice"
  is_ranking <- question_types == "ranking"
  is_other <- !(is_checkboxes | is_multiple_choice | is_ranking)
  
  # 4 buckets for 4 types of logical vectors (buckets)
  parts <- vector("list", 4) 
  part_count <- 0L

  if (any(is_checkboxes)) { # converts checkbox-type questions into multiple binary IRT items
    row_idx <- which(is_checkboxes) # get indices of checkbox rows
    counts <- option_counts[row_idx] # number of options per question
    rep_idx <- rep.int(row_idx, counts) # repeat each question index per option
    option_index <- sequence(counts) # generate option indices aligned with repeats
    values <- mapply( # vectorized loop over question option pairs
      function(source_row, option_i) {
        as.integer(choices_list[[source_row]][[option_i]] %in% selected_list[[source_row]])
      },
      rep_idx,
      option_index,
      USE.NAMES = FALSE
    )

    part_count <- part_count + 1L
    parts[[part_count]] <- tibble::tibble(
      session_id = session_ids[rep_idx],
      question_id = question_ids[rep_idx],
      item_id = make_checkbox_item_id(question_ids[rep_idx], option_index),
      question_type = question_types[rep_idx],
      option_count = option_counts[rep_idx],
      value = as.numeric(values)
    )
  }

  if (any(is_multiple_choice)) {
    row_idx <- which(is_multiple_choice)
    values <- raw_data$answer_numeric[row_idx]
    needs_text_match <- is.na(values) & !is.na(raw_data$answer_text[row_idx])

    if (any(needs_text_match)) {
      text_match_rows <- row_idx[needs_text_match]
      values[needs_text_match] <- vapply(
        text_match_rows,
        function(source_row) match(raw_data$answer_text[[source_row]], choices_list[[source_row]]),
        numeric(1)
      )
    }

    is_binary <- option_counts[row_idx] == 2 & !is.na(values) & values %in% c(1, 2)
    values[is_binary] <- values[is_binary] - 1

    part_count <- part_count + 1L
    parts[[part_count]] <- tibble::tibble(
      session_id = session_ids[row_idx],
      question_id = question_ids[row_idx],
      item_id = question_ids[row_idx],
      question_type = question_types[row_idx],
      option_count = option_counts[row_idx],
      value = as.numeric(values)
    )
  }

  if (any(is_ranking)) {
    row_idx <- which(is_ranking)

    part_count <- part_count + 1L
    parts[[part_count]] <- tibble::tibble(
      session_id = session_ids[row_idx],
      question_id = question_ids[row_idx],
      item_id = question_ids[row_idx],
      question_type = question_types[row_idx],
      option_count = option_counts[row_idx],
      value = NA_real_
    )
  }

  if (any(is_other)) {
    row_idx <- which(is_other)

    part_count <- part_count + 1L
    parts[[part_count]] <- tibble::tibble(
      session_id = session_ids[row_idx],
      question_id = question_ids[row_idx],
      item_id = question_ids[row_idx],
      question_type = question_types[row_idx],
      option_count = option_counts[row_idx],
      value = as.numeric(raw_data$answer_numeric[row_idx])
    )
  }

  # This line combines all the separate processed chunks stored in parts into a single unified data frame.
  dplyr::bind_rows(parts[seq_len(part_count)])
}

# [REFACTOR] get ranking_data so that we can filter them out (Since Plackett-Luce is not supported yet)
# =========================
# 6. PIVOT TO WIDE FORMAT
# =========================
ranking_data <- raw %>%
  filter(question_type == "ranking") %>%
  select(
    session_id,
    question_id,
    question_text,
    question_options,
    answer_options,
    dimension
  )

analysis_rows <- build_analysis_rows(raw) 

# Important for mapping 
item_metadata <- analysis_rows %>%
  distinct(item_id, question_id, question_type, option_count)

all_item_metadata <- item_metadata

analysis_rows <- analysis_rows %>%
  filter(question_type != "ranking")

item_metadata <- item_metadata %>%
  filter(question_type != "ranking")

analysis_data <- analysis_rows %>%
  select(session_id, item_id, value) %>%
  group_by(session_id, item_id) %>%
  summarise(value = first(value), .groups = "drop") %>%
  pivot_wider(
    names_from = item_id,
    values_from = value,
    values_fn = first,
    values_fill = NA
  ) %>%
  select(-session_id)

# =========================
# 7. CLEAN MATRIX
# =========================
analysis_data <- as.data.frame(
  lapply(analysis_data, as.numeric),
  check.names = FALSE
)

# remove empty columns (important for real survey data)
analysis_data <- analysis_data[, colSums(!is.na(analysis_data)) > 0, drop = FALSE]
item_metadata <- item_metadata %>%
  filter(item_id %in% colnames(analysis_data)) %>%
  arrange(match(item_id, colnames(analysis_data)))


# =========================
# 8. ITEM TYPE DETECTION (ROBUST VERSION)
# =========================
# VERY IMPORTANT - CORE MAPPING - ITEM TYPE DETECTION (ROBUST VERSION)

# Works on one question. Takes its type and number of options, then maps it to a model
# to use in mirt
map_question_type_to_model <- function(question_type, option_count) {
  if (question_type == "checkboxes") {
    return("multivariate_2pl_binary_options")
  }

  if (question_type == "likert_scale") {
    return("grm")
  }

  if (question_type == "multiple_choice" && option_count == 2) {
    return("2pl_binary")
  }

  if (question_type == "multiple_choice" && option_count > 2) {
    return("nrm_softmax")
  }

  if (question_type == "ranking") {
    return("plackett_luce_sequential_softmax")
  }

  stop(paste0("Unsupported question_type for IRT mapping: ", question_type))
}

# maps the names to the actual model in mirt 
map_model_to_mirt_itemtype <- function(model_type) {
  if (model_type %in% c("multivariate_2pl_binary_options", "2pl_binary")) {
    return("2PL")
  }

  if (model_type == "grm") {
    return("graded")
  }

  if (model_type == "nrm_softmax") {
    return("nominal")
  }

  if (model_type == "plackett_luce_sequential_softmax") {
    return(NA_character_)
  }

  stop(paste0("Unsupported model_type: ", model_type))
}

# [REFACTOR] - May have to update this if there are more question types in the future 
supported_question_types <- c(
  "checkboxes",
  "likert_scale",
  "multiple_choice",
  "ranking"
)

unsupported_question_types <- setdiff(unique(all_item_metadata$question_type), supported_question_types)
if (length(unsupported_question_types) > 0) {
  stop(
    paste0(
      "Unsupported question_type values in analysis data: ",
      paste(unsupported_question_types, collapse = ", ")
    )
  )
}

all_item_metadata <- all_item_metadata %>%
  mutate(
    response_model = dplyr::case_when(
      question_type == "checkboxes" ~ "multivariate_2pl_binary_options",
      question_type == "likert_scale" ~ "grm",
      question_type == "multiple_choice" & option_count == 2 ~ "2pl_binary",
      question_type == "multiple_choice" & option_count > 2 ~ "nrm_softmax",
      question_type == "ranking" ~ "plackett_luce_sequential_softmax",
      TRUE ~ NA_character_
    ),
    mirt_itemtype = dplyr::case_when(
      response_model %in% c("multivariate_2pl_binary_options", "2pl_binary") ~ "2PL",
      response_model == "grm" ~ "graded",
      response_model == "nrm_softmax" ~ "nominal",
      response_model == "plackett_luce_sequential_softmax" ~ NA_character_,
      TRUE ~ NA_character_
    )
  )

ranking_items <- all_item_metadata %>%
  filter(response_model == "plackett_luce_sequential_softmax")

if (nrow(ranking_items) > 0) {
  message(
    paste0(
      "Ranking items are mapped to Plackett-Luce (sequential softmax), ",
      "which is not fit by mirt in this script. Excluding ranking items ",
      "from the mirt fit for now and preserving them in ranking_data. ",
      "Excluded ranking item ids: ",
      paste(ranking_items$item_id, collapse = ", ")
    )
  )
}

item_metadata <- item_metadata %>%
  mutate(
    response_model = dplyr::case_when(
      question_type == "checkboxes" ~ "multivariate_2pl_binary_options",
      question_type == "likert_scale" ~ "grm",
      question_type == "multiple_choice" & option_count == 2 ~ "2pl_binary",
      question_type == "multiple_choice" & option_count > 2 ~ "nrm_softmax",
      question_type == "ranking" ~ "plackett_luce_sequential_softmax",
      TRUE ~ NA_character_
    ),
    mirt_itemtype = dplyr::case_when(
      response_model %in% c("multivariate_2pl_binary_options", "2pl_binary") ~ "2PL",
      response_model == "grm" ~ "graded",
      response_model == "nrm_softmax" ~ "nominal",
      response_model == "plackett_luce_sequential_softmax" ~ NA_character_,
      TRUE ~ NA_character_
    )
  )


item_types <- item_metadata$mirt_itemtype

item_types <- as.character(item_types)

stopifnot(length(item_types) == ncol(analysis_data))

sanitize_factor_name <- function(x) {
  cleaned <- gsub("[^A-Za-z0-9_]+", "_", x)
  cleaned <- gsub("^_+|_+$", "", cleaned)
  cleaned <- ifelse(grepl("^[A-Za-z]", cleaned), cleaned, paste0("trait_", cleaned))
  make.unique(cleaned, sep = "_")
}

compile_mirt_model <- function(item_metadata, dimensions, question_map) {
  metadata_with_dimensions <- item_metadata %>%
    left_join(question_map, by = "question_id") %>%
    mutate(item_index = dplyr::row_number()) %>%
    filter(!is.na(dimension), dimension %in% dimensions)

  modeled_dimensions <- dimensions[dimensions %in% metadata_with_dimensions$dimension]
  if (length(modeled_dimensions) == 0) {
    stop("No configured latent traits have modeled items after filtering")
  }

  factor_names <- sanitize_factor_name(modeled_dimensions)
  names(factor_names) <- modeled_dimensions

  factor_lines <- vapply(
    modeled_dimensions,
    function(dimension) {
      item_indices <- metadata_with_dimensions %>%
        filter(.data$dimension == .env$dimension) %>%
        pull(item_index)

      paste0(factor_names[[dimension]], " = ", paste(item_indices, collapse = ", "))
    },
    character(1)
  )

  cov_lines <- character(0)
  if (length(factor_names) > 1) {
    cov_pairs <- utils::combn(unname(factor_names), 2, simplify = FALSE)
    cov_lines <- paste0(
      "COV = ",
      paste(vapply(cov_pairs, paste, character(1), collapse = "*"), collapse = ", ")
    )
  }

  list(
    syntax = paste(c(factor_lines, cov_lines), collapse = "\n"),
    dimensions = modeled_dimensions,
    factor_names = unname(factor_names)
  )
}

# =========================
# 9. DEFINE CONFIG-CONSTRAINED MIRT MODEL
# =========================
compiled_model <- compile_mirt_model(
  item_metadata = item_metadata,
  dimensions = dimensions,
  question_map = question_map
)

model <- mirt.model(compiled_model$syntax)
modeled_dimensions <- compiled_model$dimensions
num_thetas <- length(modeled_dimensions)

# =========================
# 10. FIT MODEL
# =========================
fit <- mirt(
  data = analysis_data,
  model = model,
  itemtype = item_types,
  verbose = !api_mode
)

# [REFACTOR] 
# =========================
# 11. EXTRACT THETAS
# =========================
theta <- fscores(fit, full.scores.SE = TRUE)

theta_df <- as.data.frame(theta)
# colnames(theta_df) <- c(
#   "econ",
#   "housing",
#   "se_econ",
#   "se_housing"
# )

colnames(theta_df) <- c(
    modeled_dimensions,
    paste0("se_", modeled_dimensions)
)

# Write a compact JSON artifact that the API can serve to the frontend.
# The endpoint falls back to config preview data if this file does not exist yet.
latent_trait_output_dir <- Sys.getenv("LATENT_TRAIT_OUTPUT_DIR", "api/latent_trait_outputs")
dir.create(latent_trait_output_dir, recursive = TRUE, showWarnings = FALSE)

safe_numeric <- function(x) {
  if (length(x) == 0 || is.na(x) || !is.finite(x)) {
    return(NULL)
  }

  as.numeric(x)
}

summarize_dimension <- function(dimension) {
  theta_values <- theta_df[[dimension]]
  se_col <- paste0("se_", dimension)
  se_values <- if (se_col %in% names(theta_df)) theta_df[[se_col]] else numeric(0)
  theta_values <- theta_values[is.finite(theta_values)]
  se_values <- se_values[is.finite(se_values)]

  theta_sd <- if (length(theta_values) > 1) stats::sd(theta_values) else NA_real_
  reliability <- NA_real_
  if (length(se_values) > 0 && is.finite(theta_sd) && theta_sd > 0) {
    reliability <- 1 - (mean(se_values^2) / (theta_sd^2 + mean(se_values^2)))
    reliability <- max(0, min(1, reliability))
  }

  list(
    id = dimension,
    label = dimension,
    description = paste0("Estimated latent trait: ", dimension),
    question_ids = question_map %>%
      filter(dimension == .env$dimension) %>%
      pull(question_id) %>%
      unique() %>%
      as.character(),
    mean = safe_numeric(mean(theta_values)),
    median = safe_numeric(stats::median(theta_values)),
    standardDeviation = safe_numeric(theta_sd),
    standardError = safe_numeric(mean(se_values)),
    min = safe_numeric(min(theta_values)),
    max = safe_numeric(max(theta_values)),
    reliability = safe_numeric(reliability),
    respondents = length(theta_values)
  )
}

fit_log_likelihood <- extract.mirt(fit, "logLik")
fit_aic <- extract.mirt(fit, "AIC")
fit_bic <- extract.mirt(fit, "BIC")
fit_summary <- list(
  survey_id = config$survey_id,
  status = "fit_complete",
  source_file = config$source_file,
  generated_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
  dimensions = lapply(modeled_dimensions, summarize_dimension),
  fit = list(
    status = "complete",
    model = "Config-driven mixed-format MIRT",
    itemTypes = sort(unique(item_types)),
    estimatedItems = ncol(analysis_data),
    excludedQuestionTypes = c("ranking"),
    logLikelihood = safe_numeric(fit_log_likelihood),
    aic = safe_numeric(fit_aic),
    bic = safe_numeric(fit_bic),
    lastRun = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  )
)

latent_trait_output_path <- file.path(latent_trait_output_dir, paste0(config$survey_id, ".json"))
jsonlite::write_json(
  fit_summary,
  latent_trait_output_path,
  pretty = TRUE,
  auto_unbox = TRUE,
  na = "null"
)
message(paste0("Wrote latent trait summary to ", latent_trait_output_path))


# =========================
# 12. VISUALISATIONS
# =========================
if (!api_mode) {
  first_dimension <- modeled_dimensions[[1]]

  ggplot(theta_df, aes(x = .data[[first_dimension]])) +
    geom_histogram(bins = 30, fill = "steelblue") +
    theme_minimal() +
    labs(title = paste0(first_dimension, " (Theta Distribution)"))

  if (length(modeled_dimensions) >= 2) {
    # Pairwise structure
    pairs(theta_df[, modeled_dimensions, drop = FALSE],
          main = "Latent Trait Space")

    # Correlation structure
    print(cor(theta_df[, modeled_dimensions, drop = FALSE]))
  }

  theta_long <- theta_df %>%
    select(all_of(modeled_dimensions)) %>%
    pivot_longer(cols = everything(),
                 names_to = "trait",
                 values_to = "theta")

  p <- ggplot(theta_long, aes(x = theta)) +
    geom_histogram(bins = 30, fill = "steelblue") +
    facet_wrap(~trait, scales = "free") +
    theme_minimal() +
    labs(title = "Latent Trait Distributions (MIRT)",
         x = "Theta",
         y = "Count")

  print(p)
}

# =========================
# 13. MODEL SUMMARY
# =========================
summary(fit)
