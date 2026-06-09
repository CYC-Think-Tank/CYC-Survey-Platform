# =========================
# 0. Libraries
# =========================
library(mirt)
library(DBI)
library(RPostgres)
library(dplyr)
library(tidyr)
library(jsonlite)
library(stringr)
library(ggplot2)

# =========================
# 1. DB CONNECTION
# =========================
con <- dbConnect(
  RPostgres::Postgres(),
  dbname = "postgres",
  host = "127.0.0.1",
  port = 54322,
  user = "postgres",
  password = "postgres"
)

# =========================
# 2. LOAD DATA
# =========================
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

raw <- dbGetQuery(con, query)
dbDisconnect(con)

# =========================
# 3. CLEAN DUPLICATES (CRITICAL)
# =========================
raw <- raw %>%
  distinct(session_id, question_id, .keep_all = TRUE)

# =========================
# 4. DEFINE LATENT TRAITS (SOURCE OF TRUTH)
# =========================
question_map <- tibble::tribble(
  ~question_id, ~dimension,

  # ECON
  "91ffd2f9-7196-42b9-a69e-5db349a53b6a", "econ",
  "28a91e5e-8fec-47a2-94bf-9f02a709f28c", "econ",
  "6c6222fd-9dfc-450c-939e-cbdda54314fd", "econ",
  "5b548ad9-68f9-458d-9cf9-1fc7abd516af", "econ",
  "13f07740-97c0-4b19-9f3f-85d3628fe39b", "econ",
  "74be2b35-cc5b-4a9f-b54e-1b165377d82d", "econ",
  "f1ebeeae-e5cc-4c39-bc09-6d0e045b5ac1", "econ",
  "f5bba936-23bb-41ac-952c-71fdb1163840", "econ",
  "5ba685e3-3e8d-404d-ae04-09fd96f27894", "econ",
  "15ec7a5e-c115-46f8-a6a0-dbc7bcf11594", "econ",
  "b0d63aa9-f3cf-4183-9c23-29a6b94a9dd3", "econ",

  # HOUSING
  "dc612446-8b71-45f0-91e0-112b32a2d38d", "housing",
  "7bc5c9fc-8729-42ef-afbd-59f65ecbae4b", "housing",
  "509fba4c-4a63-4a38-bd59-302f3956453d", "housing",
  "75a81f05-24d9-4a30-a26d-42de558db94a", "housing",
  "d79a40c8-5c7c-47e3-843d-d9571e9656e8", "housing",
  "6756ef98-2e01-4da8-9305-c240ef1403b6", "housing",
  "fdb1145b-3e0b-498e-a091-97d9b1fc172e", "housing",
)

question_map <- question_map %>%
  distinct(question_id, dimension)

# =========================
# 5. JOIN + FILTER
# =========================
raw <- raw %>%
  left_join(question_map, by = "question_id") %>%
  filter(!is.na(dimension))

# =========================
# 5b. RESPONSE METADATA HELPERS
# =========================
parse_json_value <- function(x) {
  if (is.null(x) || length(x) == 0 || all(is.na(x))) {
    return(NULL)
  }

  if (is.character(x)) {
    return(fromJSON(x, simplifyVector = FALSE))
  }

  x
}

get_question_choices <- function(question_options) {
  opts <- parse_json_value(question_options)

  if (is.null(opts)) {
    return(character(0))
  }

  if (is.list(opts) && !is.null(opts$choices)) {
    return(as.character(opts$choices))
  }

  if (is.atomic(opts) || is.list(opts)) {
    return(as.character(unlist(opts, use.names = FALSE)))
  }

  character(0)
}

get_answer_options <- function(answer_options) {
  opts <- parse_json_value(answer_options)

  if (is.null(opts)) {
    return(character(0))
  }

  as.character(unlist(opts, use.names = FALSE))
}

make_checkbox_item_id <- function(question_id, option_index) {
  paste0(question_id, "__option_", option_index)
}

build_analysis_rows <- function(raw_data) {
  session_ids <- raw_data$session_id
  question_ids <- raw_data$question_id
  question_types <- as.character(raw_data$question_type)

  choices_list <- lapply(raw_data$question_options, get_question_choices)
  option_counts <- vapply(choices_list, length, integer(1))
  selected_list <- lapply(raw_data$answer_options, get_answer_options)

  needs_choices <- question_types %in% c("checkboxes", "multiple_choice", "ranking")
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

  is_checkboxes <- question_types == "checkboxes"
  is_multiple_choice <- question_types == "multiple_choice"
  is_ranking <- question_types == "ranking"
  is_other <- !(is_checkboxes | is_multiple_choice | is_ranking)

  parts <- vector("list", 4)
  part_count <- 0L

  if (any(is_checkboxes)) {
    row_idx <- which(is_checkboxes)
    counts <- option_counts[row_idx]
    rep_idx <- rep.int(row_idx, counts)
    option_index <- sequence(counts)
    values <- mapply(
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

  dplyr::bind_rows(parts[seq_len(part_count)])
}

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

# =========================
# 9. DEFINE 2D MIRT MODEL
# =========================
# IMPORTANT: this is generic; mirt estimates structure from data
model <- 2

# =========================
# 10. FIT MODEL
# =========================
fit <- mirt(
  data = analysis_data,
  model = model,
  itemtype = item_types,
  verbose = TRUE
)

# =========================
# 11. EXTRACT THETAS
# =========================
theta <- fscores(fit, full.scores.SE = TRUE)

theta_df <- as.data.frame(theta)
colnames(theta_df) <- c(
  "econ",
  "housing",
  "se_econ",
  "se_housing"
)

# =========================
# 12. VISUALISATIONS
# =========================

# Econ distribution
ggplot(theta_df, aes(x = econ)) +
  geom_histogram(bins = 30, fill = "steelblue") +
  theme_minimal() +
  labs(title = "Economic Attitudes (Theta Distribution)")

# Pairwise structure
pairs(theta_df[, 1:2],
      main = "Latent Trait Space (econ / housing)")

# Correlation structure
print(cor(theta_df[, 1:2]))

theta_long <- theta_df %>%
  select(econ, housing) %>%
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

# =========================
# 13. MODEL SUMMARY
# =========================
summary(fit)
