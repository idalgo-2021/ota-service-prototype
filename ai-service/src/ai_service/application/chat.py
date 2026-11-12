import asyncio
import logging
import re
from collections.abc import Callable
from typing import Any
from uuid import UUID, uuid4

from ai_service.domain.models import AssistantContext, AssistantReply
from ai_service.domain.ports import AssistantPort, ChatRepository

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(
        self,
        repository: ChatRepository,
        assistant: AssistantPort,
        history_limit: int,
        action_executor: Callable[[dict[str, Any], str], dict[str, Any]],
    ):
        self._repository = repository
        self._assistant = assistant
        self._history_limit = history_limit
        self._action_executor = action_executor

    @staticmethod
    def _is_confirmation(message: str) -> bool:
        return bool(
            re.fullmatch(
                r"(?:да(?:,?\s*(?:подтверждаю|всё верно|все верно|согласен|согласна|"
                r"бронируйте|оформляйте|добавляйте))?|подтверждаю|согласен|согласна|"
                r"верно|оформляйте|добавляйте|бронируйте|yes|confirm|confirmed|go ahead)[.!\s]*",
                message.strip(),
                re.IGNORECASE,
            )
        )

    @staticmethod
    def _is_rejection(message: str) -> bool:
        return bool(
            re.fullmatch(
                r"(?:нет|не подтверждаю|отменить|отмена|no|cancel)[.!\s]*",
                message.strip(),
                re.IGNORECASE,
            )
        )

    @staticmethod
    def _is_confirmation_prompt(history: list[tuple[str, str]]) -> bool:
        if not history or history[-1][0] != "assistant":
            return False
        prompt = history[-1][1].casefold()
        return "?" in prompt and any(
            text in prompt for text in ("подтвержда", "добавить", "создать бронь", "confirm")
        )

    @staticmethod
    def _completed_message(action: dict[str, Any]) -> str:
        if action.get("type") == "booking":
            return f"Готово, бронь создана: {action['summary']}."
        return f"Готово, добавил в ваш заказ: {action['summary']}."

    async def reply(
        self,
        message: str,
        session_id: str | None,
        user_id: str | None = None,
        access_token: str | None = None,
    ) -> tuple[str, AssistantReply]:
        message = message.strip()
        if not message or len(message) > 4000:
            raise ValueError("message must contain 1 to 4000 characters")
        if session_id:
            try:
                session_id = str(UUID(session_id))
            except ValueError as exc:
                raise ValueError("session_id must be a UUID") from exc
        else:
            session_id = str(uuid4())
        owner_type = "user" if user_id else "guest"
        owner_id = user_id or session_id
        context = AssistantContext(user_id=user_id, access_token=access_token)
        history = await self._repository.history(
            session_id, owner_type, owner_id, self._history_limit
        )
        pending = await self._repository.get_pending_action(session_id, owner_type, owner_id)
        if pending and self._is_rejection(message):
            await self._repository.clear_pending_action(session_id, owner_type, owner_id)
            reply = AssistantReply(message="Хорошо, предложение отменено.")
            await self._repository.append_message(session_id, owner_type, owner_id, "user", message)
            await self._repository.append_message(
                session_id, owner_type, owner_id, "assistant", reply.message
            )
            await self._repository.trim_history(
                session_id, owner_type, owner_id, self._history_limit
            )
            return session_id, reply
        if (
            pending
            and user_id
            and access_token
            and self._is_confirmation(message)
            and self._is_confirmation_prompt(history)
        ):
            action = await self._repository.take_pending_action(session_id, owner_type, owner_id)
            if action:
                try:
                    action_result = await asyncio.to_thread(
                        self._action_executor, action, access_token
                    )
                    reply = AssistantReply(
                        message=self._completed_message(action),
                        cart_updated=action.get("type") == "product",
                        booking_created=action.get("type") == "booking",
                        booking_id=(
                            str(action_result["id"])
                            if action.get("type") == "booking"
                            and isinstance(action_result, dict)
                            and action_result.get("id")
                            else None
                        ),
                    )
                except Exception:
                    logger.exception("confirmed assistant action failed")
                    reply = AssistantReply(
                        message=(
                            "Не удалось выполнить действие. Предложение отменено; "
                            "проверьте актуальность выбранных данных и попробуйте ещё раз."
                        )
                    )
                await self._repository.append_message(
                    session_id, owner_type, owner_id, "user", message
                )
                await self._repository.append_message(
                    session_id, owner_type, owner_id, "assistant", reply.message
                )
                await self._repository.trim_history(
                    session_id, owner_type, owner_id, self._history_limit
                )
                return session_id, reply

        if self._is_confirmation(message) and self._is_confirmation_prompt(history) and not pending:
            reply = AssistantReply(
                message=(
                    "Не удалось сохранить точные параметры заказа, поэтому я не могу оформить "
                    "его по этому подтверждению. Уточните выбранный тур и дату, и я проверю "
                    "актуальное предложение заново."
                )
            )
            await self._repository.append_message(session_id, owner_type, owner_id, "user", message)
            await self._repository.append_message(
                session_id, owner_type, owner_id, "assistant", reply.message
            )
            await self._repository.trim_history(
                session_id, owner_type, owner_id, self._history_limit
            )
            return session_id, reply

        if pending:
            # Any non-confirmation response invalidates the exact proposal.
            await self._repository.clear_pending_action(session_id, owner_type, owner_id)
        reply = await asyncio.to_thread(self._assistant.respond, message, history, context)
        reply = AssistantReply(
            message=reply.message[:12000],
            recommendations=reply.recommendations[:6],
            pending_action=reply.pending_action,
            quick_replies=reply.quick_replies,
        )
        if reply.pending_action and user_id and access_token:
            await self._repository.save_pending_action(
                session_id, owner_type, owner_id, reply.pending_action
            )
            verb = (
                "создать бронь"
                if reply.pending_action.get("type") == "booking"
                else "добавить в заказ"
            )
            reply = AssistantReply(
                message=(
                    f"Проверьте, пожалуйста: {reply.pending_action['summary']}. "
                    f"Подтверждаете {verb}?"
                ),
                recommendations=reply.recommendations,
                quick_replies=("Да", "Нет"),
            )
        await self._repository.append_message(session_id, owner_type, owner_id, "user", message)
        await self._repository.append_message(
            session_id, owner_type, owner_id, "assistant", reply.message
        )
        await self._repository.trim_history(session_id, owner_type, owner_id, self._history_limit)
        return session_id, reply
