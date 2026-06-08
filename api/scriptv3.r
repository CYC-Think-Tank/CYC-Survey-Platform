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
  group_by(session_id, question_id) %>%
  summarise(
    answer_numeric = first(answer_numeric),
    answer_text = first(answer_text),
    answer_options = first(answer_options),
    question_type = first(question_type),
    question_options = first(question_options),
    question_text = first(question_text),
    .groups = "drop"
  )

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
  rows <- vector("list", 0)

  for (i in seq_len(nrow(raw_data))) {
    row <- raw_data[i, ]
    question_type <- as.character(row$question_type)
    choices <- get_question_choices(row$question_options)
    option_count <- length(choices)

    if (question_type %in% c("checkboxes", "multiple_choice", "ranking") && option_count == 0) {
      stop(
        paste0(
          "Question ", row$question_id,
          " has type ", question_type,
          " but no metadata choices in questions.options"
        )
      )
    }

    if (question_type == "checkboxes") {
      selected <- get_answer_options(row$answer_options)

      for (option_index in seq_along(choices)) {
        rows[[length(rows) + 1]] <- tibble::tibble(
          session_id = row$session_id,
          question_id = row$question_id,
          item_id = make_checkbox_item_id(row$question_id, option_index),
          question_type = question_type,
          option_count = option_count,
          value = as.integer(choices[[option_index]] %in% selected)
        )
      }
    } else if (question_type == "multiple_choice") {
      value <- row$answer_numeric

      if (is.na(value) && !is.na(row$answer_text)) {
        value <- match(row$answer_text, choices)
      }

      if (!is.na(value) && option_count == 2 && value %in% c(1, 2)) {
        value <- value - 1
      }

      rows[[length(rows) + 1]] <- tibble::tibble(
        session_id = row$session_id,
        question_id = row$question_id,
        item_id = row$question_id,
        question_type = question_type,
        option_count = option_count,
        value = as.numeric(value)
      )
    } else if (question_type == "ranking") {
      rows[[length(rows) + 1]] <- tibble::tibble(
        session_id = row$session_id,
        question_id = row$question_id,
        item_id = row$question_id,
        question_type = question_type,
        option_count = option_count,
        value = NA_real_
      )
    } else {
      rows[[length(rows) + 1]] <- tibble::tibble(
        session_id = row$session_id,
        question_id = row$question_id,
        item_id = row$question_id,
        question_type = question_type,
        option_count = option_count,
        value = as.numeric(row$answer_numeric)
      )
    }
  }

  dplyr::bind_rows(rows)
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
  lapply(analysis_data, function(x) as.numeric(x)),
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
  rowwise() %>%
  mutate(
    response_model = map_question_type_to_model(question_type, option_count),
    mirt_itemtype = map_model_to_mirt_itemtype(response_model)
  ) %>%
  ungroup()

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
  rowwise() %>%
  mutate(
    response_model = map_question_type_to_model(question_type, option_count),
    mirt_itemtype = map_model_to_mirt_itemtype(response_model)
  ) %>%
  ungroup()

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
