import argparse
import asyncio
import logging

from ai_service.application.container import build_container
from ai_service.config import get_settings


async def run_once(stage: str) -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    container = build_container(settings)
    try:
        if stage in {"import", "all"}:
            result = await container.reviews.import_recent_listing_reviews()
            logging.info("review import finished: %s", result)
        if stage in {"summarize", "all"}:
            result = await container.reviews.summarize_pending_listings()
            logging.info("review summarization finished: %s", result)
        if stage == "disappointment-import":
            result = await container.disappointment_candidates.import_candidates()
            logging.info("disappointment candidate import finished: %s", result)
        if stage == "disappointment-detect":
            result = await container.disappointment_detection.analyze_candidates()
            logging.info("disappointment detection finished: %s", result)
    finally:
        await container.engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run one AI-service maintenance job")
    parser.add_argument(
        "--stage",
        choices=("import", "summarize", "all", "disappointment-import", "disappointment-detect"),
        default="all",
        help="Run review import, summary generation, or disappointment candidate import",
    )
    parser.add_argument("--once", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    asyncio.run(run_once(args.stage))
