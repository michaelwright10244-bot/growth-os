from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=2000)
    contact: str = Field(default="", max_length=500)


class ProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    goal: str = Field(min_length=1, max_length=2000)
    role: str = Field(min_length=1, max_length=1000)
    status: Literal["进行中", "已完成", "待整理"] = "进行中"
    summary: str = Field(default="", max_length=2000)
    is_public: bool = False


class VisibilityInput(BaseModel):
    is_public: bool


class MaterialInput(BaseModel):
    kind: Literal["经历", "资料", "想法"] = "经历"
    body: str = Field(min_length=1, max_length=10000)
    source_type: Literal["手工记录", "外部笔记", "项目文档", "代码仓库", "本地文件"] = "手工记录"
    source_url: HttpUrl | None = None
    project_id: UUID | None = None
    ai_allowed: bool = False


class CommitInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    before_text: str = Field(min_length=1, max_length=2000)
    after_text: str = Field(min_length=1, max_length=2000)
    project_id: UUID
    occurred_at: datetime | None = None


class DraftStatusInput(BaseModel):
    status: Literal["confirmed", "rejected"]


class AgentRunInput(BaseModel):
    task: str = Field(min_length=1, max_length=3000)
    material_ids: list[UUID] = Field(default_factory=list, max_length=20)


class JobInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    company: str = Field(default="未填写", max_length=200)
    source_url: HttpUrl | None = None
    description: str = Field(min_length=20, max_length=20_000)


class JobAnalysisInput(BaseModel):
    project_ids: list[UUID] = Field(min_length=1, max_length=10)
    material_ids: list[UUID] = Field(default_factory=list, max_length=20)

