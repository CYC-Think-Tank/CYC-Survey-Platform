from typing import Any

from pydantic import BaseModel


class Question(BaseModel):
    id: str
    question_text: str
    type: str
    order_index: int
    options: Any | None = None
    is_required: bool
    is_conditional: bool = False


class SurveyList(BaseModel):
    id: str
    title: str
    description: str | None = None
    description_alignment: str | None = "left"
    estimated_minutes: int
    is_active: bool
    has_been_published: bool = False
    thumbnail_url: str | None = None
    response_count: int | None = 0
    enabled_languages: list[str] | None = None


class SurveyDetail(SurveyList):
    questions: list[Question]


class AnswerCreate(BaseModel):
    question_id: str
    answer_text: str | None = None
    answer_numeric: int | None = None
    answer_options: Any | None = None
    time_spent: int | None = 0


class ResponseSubmission(BaseModel):
    email: str
    answers: list[AnswerCreate]
    language: str | None = None
    referral_source: str | None = None


class QuestionCreate(BaseModel):
    id: str | None = None
    question_text: str
    type: str
    order_index: int
    options: Any | None = None
    is_required: bool
    is_conditional: bool = False


class SurveyCreate(BaseModel):
    title: str
    description: str | None = None
    description_alignment: str | None = "left"
    estimated_minutes: int = 5
    is_active: bool = True
    has_been_published: bool = False
    thumbnail_url: str | None = None
    enabled_languages: list[str] | None = None
    questions: list[QuestionCreate]


class SessionCreate(BaseModel):
    email: str
    referral_source: str | None = None


class AnswerUpsert(BaseModel):
    question_id: str
    answer_text: str | None = None
    answer_numeric: int | None = None
    answer_options: Any | None = None
    time_spent: int | None = 0


class CheckStatusRequest(BaseModel):
    email: str


class ShareLinkCreate(BaseModel):
    label: str | None = None


class AIAnalysisRequest(BaseModel):
    force_refresh: bool = False


class BlogPostCreate(BaseModel):
    title: str
    subject: str
    content: str
    author: str | None = None
    thumbnail_url: str | None = None
    is_published: bool = False


class BlogPostUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    content: str | None = None
    author: str | None = None
    thumbnail_url: str | None = None
    is_published: bool | None = None


class BlogPost(BaseModel):
    id: str
    title: str
    subject: str
    content: str
    author: str | None = None
    thumbnail_url: str | None = None
    is_published: bool
    created_at: str
    updated_at: str

