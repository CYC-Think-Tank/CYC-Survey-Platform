# Project Brief: [Project Name]

## 1. Overview

A platform that allows people to fill out surveys that test alignment and knowledge of Canadian economic, environmental, and housing policy.
The backend also consists of analytical pipelines to take survey data from thousands of young Canadians and extract insights. The current
infrastructure is a Gemini API. I am working on adding explicit statistical models for more auditable findings. This project builds a mixed-format IRT system for estimating latent traits from survey data, supporting binary, ordinal, and nominal responses.

---

## 2. Objectives

- Estimate latent traits (θ) from survey responses
- Support multiple item response types (2PL, GRM, NRM)
- Ensure statistical interpretability and reproducibility

---

## 3. Non-Goals

- Does not use LLMs for latent inference
- Does not perform real-time personalization or recommendation

---

## 4. Core Principles

- All inference must be likelihood-based
- All model outputs must be reproducible
- All item types must be metadata-defined

---

## 5. System Inputs

- Input type 1: Survey responses (binary, ordinal, nominal)
- Input type 2: Question metadata (type, dimension, options)

---

## 6. System Outputs

- Output 1: Latent trait estimates (θ)
- Output 2: Standard errors / uncertainty estimates
- Output 3: Model diagnostics (log-likelihood, fit stats)

---

## 7. Latent Structure

How the model represents hidden variables.

- Dimensionality: Multidimensional IRT
- Dimensions: econ, housing

---

## 8. Modeling Approach

- Base framework: Mixed-format IRT
- Item response models used: 2PL (binary), GRM (ordinal), NRM (nominal)
- Likelihood structure: Joint likelihood across item types

---

## 9. Data Flow

```text
Raw survey responses
    ↓
Cleaning & validation
    ↓
Metadata-based item type assignment
    ↓
Model-specific likelihood mapping
    ↓
MIRT estimation (EM / marginal ML)
    ↓
θ estimation + SE computation
```
