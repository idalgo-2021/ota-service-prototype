import asyncio
import hashlib
import json
import logging

from ai_service.domain.models import DisappointmentCandidate
from ai_service.domain.ports import (
    DisappointmentCandidateGateway,
    DisappointmentCandidateRepository,
)

logger = logging.getLogger(__name__)
PAGE_SIZE = 100


class DisappointmentCandidateImporter:
    def __init__(
        self,
        gateway: DisappointmentCandidateGateway,
        repository: DisappointmentCandidateRepository,
    ):
        self._gateway = gateway
        self._repository = repository

    async def import_candidates(self) -> dict[str, int]:
        candidates: list[DisappointmentCandidate] = []
        seen_ids: set[str] = set()
        offset = 0
        expected_total: int | None = None

        while expected_total is None or offset < expected_total:
            response = await asyncio.to_thread(
                self._gateway.list_disappointment_candidates, PAGE_SIZE, offset
            )
            page = response.get("data")
            meta = response.get("meta")
            if not isinstance(page, list) or not isinstance(meta, dict):
                raise RuntimeError("OTA returned an invalid disappointment candidate page")
            total = meta.get("total")
            if not isinstance(total, int) or total < 0:
                raise RuntimeError("OTA returned an invalid disappointment candidate total")
            if expected_total is None:
                expected_total = total
            elif total != expected_total:
                raise RuntimeError(
                    "OTA candidate total changed during import; previous snapshot kept"
                )

            if not page and offset < expected_total:
                raise RuntimeError("OTA returned an empty page before the end of candidate data")

            for item in page:
                if not isinstance(item, dict):
                    raise RuntimeError("OTA returned an invalid disappointment candidate")
                listing_id = item.get("listing_id")
                if not isinstance(listing_id, str) or not listing_id:
                    raise RuntimeError("OTA candidate is missing listing_id")
                if listing_id in seen_ids:
                    raise RuntimeError("OTA returned a duplicate candidate; previous snapshot kept")
                seen_ids.add(listing_id)
                encoded = json.dumps(
                    item, sort_keys=True, ensure_ascii=False, separators=(",", ":")
                ).encode()
                candidates.append(
                    DisappointmentCandidate(
                        listing_id=listing_id,
                        payload=item,
                        content_hash=hashlib.sha256(encoded).hexdigest(),
                    )
                )

            offset += len(page)
            if len(page) == 0:
                break

        changed = await self._repository.replace_disappointment_candidates(candidates)
        result = {"candidates": len(candidates), "changed": changed}
        logger.info("disappointment candidate import complete: %s", result)
        return result
