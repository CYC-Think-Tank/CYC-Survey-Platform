from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import (
    ai_insights,
    blog,
    results,
    sessions,
    share_links,
    surveys,
    translations,
)

app = FastAPI(title="CYC Survey Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}


app.include_router(translations.router)
app.include_router(surveys.router)
app.include_router(sessions.router)
app.include_router(results.router)
app.include_router(share_links.router)
app.include_router(ai_insights.router)
app.include_router(blog.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
