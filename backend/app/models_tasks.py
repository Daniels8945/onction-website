from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = Field(default="")
    status: str = Field(default="todo")  # "todo" | "in_progress" | "done"
    assignee_id: Optional[int] = Field(default=None, foreign_key="adminuser.id")
    due_date: Optional[date] = None
    created_by_id: Optional[int] = Field(default=None, foreign_key="adminuser.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    status: str = Field(default="todo")
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class TaskRead(SQLModel):
    id: int
    title: str
    description: str
    status: str
    assignee_id: Optional[int]
    due_date: Optional[date]
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
