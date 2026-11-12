'use client';

import { Button, Flex, Heading, Image, Text, Textarea } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SubmitEvent } from 'react';
import Link from 'next/link';
import { api, type CatalogLanguage } from '@/lib/api';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { bookingCreatedNotification } from '@/lib/assistantNotifications';
import { getRole, getUserId } from '@/lib/auth';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { colors } from '@/shared/colors';

const COPY: Record<
  CatalogLanguage,
  {
    sectionLabel: string;
    heading: string;
    description: string;
    newChat: string;
    missingPhoto: string;
    loading: string;
    placeholder: string;
    messageLabel: string;
    send: string;
    sending: string;
    footer: string;
    requestError: string;
    connectionError: string;
    yes: string;
    no: string;
  }
> = {
  ru: {
    sectionLabel: 'ИИ-ассистент по подбору жилья и впечатлений',
    heading: 'Помочь с выбором?',
    description: 'Расскажите, куда и когда едете. Ассистент подберет жилье и впечатления из каталога.',
    newChat: 'Новый диалог',
    missingPhoto: 'Фото отсутствует',
    loading: 'Подбираю варианты…',
    placeholder: 'Например: тихий отель в центре Бишкека на выходные для двоих',
    messageLabel: 'Сообщение ассистенту',
    send: 'Отправить',
    sending: 'Ищу…',
    footer: 'Ассистент помогает с подбором; бронирование оформляется отдельно.',
    requestError: 'Не удалось получить ответ. Попробуйте ещё раз.',
    connectionError: 'Не удалось связаться с ассистентом.',
    yes: 'Да',
    no: 'Нет',
  },
  en: {
    sectionLabel: 'AI assistant for stays and experiences',
    heading: 'Need help choosing?',
    description: 'Tell us where and when you are travelling. The assistant will find stays and experiences in the catalog.',
    newChat: 'New chat',
    missingPhoto: 'No photo available',
    loading: 'Finding options…',
    placeholder: 'For example: a quiet hotel in central Bishkek for two this weekend',
    messageLabel: 'Message the assistant',
    send: 'Send',
    sending: 'Searching…',
    footer: 'The assistant can help you choose; bookings are completed separately.',
    requestError: 'Could not get a response. Please try again.',
    connectionError: 'Could not connect to the assistant.',
    yes: 'Yes',
    no: 'No',
  },
};

type Recommendation = {
  kind: 'listing' | 'product';
  id: string;
  title: string;
  image_url?: string | null;
  subtitle?: string | null;
  price_label?: string | null;
  rating_label?: string | null;
};
type Message = {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  quick_replies?: string[];
};
type ChatEnvelope = {
  session_id: string;
  message: string;
  recommendations?: Recommendation[];
  quick_replies?: string[];
  cart_updated?: boolean;
  booking_created?: boolean;
  booking_id?: string | null;
};
type StoredChat = { sessionId?: string; messages: Message[] };
const EMPTY_CHAT: StoredChat = { messages: [] };
const chatSnapshots = new Map<string, StoredChat>();
const chatListeners = new Map<string, Set<() => void>>();

const readStoredChat = (key: string): StoredChat => {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Partial<StoredChat> | null;
    if (!value || !Array.isArray(value.messages)) {
      return { messages: [] };
    }
    const messages = value.messages.filter(
      (message): message is Message =>
        !!message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
    );
    return {
      sessionId: typeof value.sessionId === 'string' ? value.sessionId : undefined,
      messages,
    };
  } catch {
    return { messages: [] };
  }
};

const writeStoredChat = (key: string, chat: StoredChat) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(chat));
  } catch {
    // Keep the chat usable if browser storage is unavailable.
  }
};

const getChatSnapshot = (key: string): StoredChat => {
  const cached = chatSnapshots.get(key);
  if (cached) {
    return cached;
  }
  const stored = readStoredChat(key);
  chatSnapshots.set(key, stored);
  return stored;
};

const subscribeToChat = (key: string, listener: () => void) => {
  const listeners = chatListeners.get(key) ?? new Set<() => void>();
  listeners.add(listener);
  chatListeners.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      chatListeners.delete(key);
    }
  };
};

const updateStoredChat = (key: string, chat: StoredChat) => {
  writeStoredChat(key, chat);
  chatSnapshots.set(key, chat);
  chatListeners.get(key)?.forEach((listener) => listener());
};

const asksToShowRecommendations = (message: string) =>
  /карточк|картинк|изображен|фото|покаж|вывед|отобраз/i.test(message);

const mentionsSpecificAccommodationType = (message: string) =>
  /хостел|отел|гостиниц|апартамент|гостев(?:ый|ого|ом)?\s*дом|коттедж|кемпинг|глэмпинг|вилл/i.test(
    message
  );

const requestedCardCount = (message: string) => {
  const normalized = message.toLocaleLowerCase();
  if (/\b(?:пару|пара|парочку|две|два|two)\b/.test(normalized)) {
    return 2;
  }
  const number = normalized.match(/\b([1-6])\s*(?:карточ|вариант|предложен)/);
  if (number) {
    return Number(number[1]);
  }
  return undefined;
};

export const AssistantChat = ({ initialPrompt }: { initialPrompt?: string } = {}) => {
  const { lang } = useCatalogLanguage();
  const t = COPY[lang];
  const dispatch = useAppDispatch();
  const { accessToken, email, restored } = useAppSelector((state) => state.auth);
  const accountId = getUserId(accessToken) ?? email?.trim().toLocaleLowerCase() ?? 'account';
  const storageKey = restored
    ? `ota_assistant_chat_v1:${getRole(accessToken) === 'user' ? accountId : 'guest'}`
    : null;
  const subscribe = useCallback(
    (listener: () => void) => (storageKey ? subscribeToChat(storageKey, listener) : () => {}),
    [storageKey]
  );
  const getSnapshot = useCallback(
    () => (storageKey ? getChatSnapshot(storageKey) : EMPTY_CHAT),
    [storageKey]
  );
  const chat = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_CHAT);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const initialPromptSent = useRef<string | null>(null);
  const messages = chat.messages;
  const sessionId = chat.sessionId;
  const visibleMessages = storageKey ? messages : [];

  const startNewChat = () => {
    if (!storageKey || busy) {
      return;
    }
    updateStoredChat(storageKey, EMPTY_CHAT);
    setDraft('');
    setError('');
  };

  const sendMessage = useCallback(async (message: string) => {
    const content = message.trim();
    if (!content || busy || !storageKey) {
      return;
    }

    const withUserMessage = [...messages, { role: 'user' as const, content }];
    updateStoredChat(storageKey, { sessionId, messages: withUserMessage });
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken && getRole(accessToken) === 'user') {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: content, session_id: sessionId }),
      });
      if (!response.ok) {
        throw new Error(t.requestError);
      }
      const result = (await response.json()) as ChatEnvelope;
      if (result.cart_updated) {
        dispatch(api.util.invalidateTags(['MyOrder']));
      }
      const bookingCreated =
        result.booking_created === true ||
        /^(?:Готово,\s*бронь создана:|Booking created successfully\b)/i.test(result.message);
      if (bookingCreated) {
        dispatch(api.util.invalidateTags(['MyBooking', 'Availability']));
        const userId = getUserId(accessToken);
        if (userId) {
          dispatch(
            bookingCreatedNotification({
              userId,
              bookingId: result.booking_id ?? `assistant-${result.session_id}`,
            })
          );
        }
      }
      const previousRecommendations = [...withUserMessage]
        .reverse()
        .find((item) => item.role === 'assistant' && item.recommendations?.length)
        ?.recommendations;
      const recommendations =
        result.recommendations?.length
          ? result.recommendations
          : asksToShowRecommendations(content) && !mentionsSpecificAccommodationType(content)
            ? (previousRecommendations ?? []).slice(
                0,
                requestedCardCount(content) ?? previousRecommendations?.length
              )
            : [];
      const nextMessages: Message[] = [
        ...withUserMessage,
        {
          role: 'assistant',
          content: result.message,
          recommendations,
          quick_replies: result.quick_replies,
        },
      ];
      updateStoredChat(storageKey, { sessionId: result.session_id, messages: nextMessages });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.connectionError);
    } finally {
      setBusy(false);
    }
  }, [accessToken, busy, dispatch, messages, sessionId, storageKey, t]);

  useEffect(() => {
    if (
      !initialPrompt ||
      !restored ||
      !storageKey ||
      busy ||
      initialPromptSent.current === initialPrompt
    ) {
      return;
    }
    initialPromptSent.current = initialPrompt;
    void sendMessage(initialPrompt);
  }, [initialPrompt, restored, storageKey, busy, sendMessage]);

  const send = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  return (
    <Flex
      as="section"
      aria-label={t.sectionLabel}
      direction="column"
      gap={4}
      w="full"
      maxW="1100px"
      p={{ base: 4, md: 6 }}
      borderRadius="20px"
      bg="white"
      boxShadow="0 12px 36px rgba(45, 49, 55, 0.08)"
    >
      <Flex align="flex-start" justify="space-between" gap={3}>
        <Flex direction="column" gap={1}>
          <Heading as="h2" size="md" color={colors.text}>
            {t.heading}
          </Heading>
          <Text color={colors.textMuted} fontSize="sm">
            {t.description}
          </Text>
        </Flex>
        {visibleMessages.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={startNewChat}
            disabled={busy}
            flexShrink={0}
            minW="140px"
            whiteSpace="nowrap"
            bg={colors.primary}
            color={colors.white}
            borderRadius="10px"
            _hover={{ bg: colors.primaryHover }}
          >
            {t.newChat}
          </Button>
        )}
      </Flex>

      {visibleMessages.length > 0 && (
        <Flex direction="column" gap={3} maxH="320px" overflowY="auto" aria-live="polite">
          {visibleMessages.map((message, index) => (
            <Flex
              key={`${message.role}-${index}`}
              alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
              direction="column"
              gap={2}
              maxW={{ base: '92%', md: '78%' }}
            >
              <Flex
                px={4}
                py={3}
                borderRadius="16px"
                bg={message.role === 'user' ? colors.primarySoft : '#F5F6F7'}
                color={colors.text}
                whiteSpace="pre-wrap"
              >
                <Text>{message.content}</Text>
              </Flex>
              {message.role === 'assistant' &&
                index === visibleMessages.length - 1 &&
                Boolean(message.quick_replies?.length) && (
                  <Flex gap={2}>
                    {message.quick_replies?.map((reply) => (
                      <Button
                        key={reply}
                        type="button"
                        size="sm"
                        variant={reply === 'Да' || reply === 'Yes' ? 'solid' : 'outline'}
                        colorScheme={reply === 'Да' || reply === 'Yes' ? 'teal' : undefined}
                        onClick={() => void sendMessage(reply)}
                        disabled={busy}
                      >
                        {reply === 'Да' ? t.yes : reply === 'Нет' ? t.no : reply}
                      </Button>
                    ))}
                  </Flex>
                )}
              {message.role === 'assistant' && Boolean(message.recommendations?.length) && (
                <Flex gap={3} overflowX="auto" pb={1} maxW="full">
                  {message.recommendations?.map((recommendation) => {
                    const href = `/${recommendation.kind === 'listing' ? 'listings' : 'products'}/${encodeURIComponent(recommendation.id)}`;
                    return (
                      <Link
                        key={`${recommendation.kind}-${recommendation.id}`}
                        href={href}
                        style={{ color: 'inherit', textDecoration: 'none', flex: '0 0 190px' }}
                      >
                        <Flex
                          direction="column"
                          overflow="hidden"
                          border="1px solid #E6E8EB"
                          borderRadius="14px"
                          bg="white"
                        >
                          {recommendation.image_url ? (
                            <Image
                              src={recommendation.image_url}
                              alt={recommendation.title}
                              objectFit="cover"
                              h="112px"
                              w="full"
                            />
                          ) : (
                            <Flex h="112px" bg="#F0F1F2" align="center" justify="center">
                              <Text color={colors.textMuted} fontSize="sm">{t.missingPhoto}</Text>
                            </Flex>
                          )}
                          <Flex direction="column" gap={1} p={3}>
                            <Text fontWeight="600" fontSize="sm" lineClamp={2}>
                              {recommendation.title}
                            </Text>
                            {recommendation.subtitle && (
                              <Text color={colors.textMuted} fontSize="xs" lineClamp={2}>
                                {recommendation.subtitle}
                              </Text>
                            )}
                            {(recommendation.rating_label || recommendation.price_label) && (
                              <Flex align="center" justify="space-between" gap={2} mt={1}>
                                {recommendation.rating_label && (
                                  <Text color="#9A6A00" fontWeight="600" fontSize="xs" whiteSpace="nowrap">
                                    ★ {recommendation.rating_label}
                                  </Text>
                                )}
                                {recommendation.price_label && (
                                  <Text fontWeight="700" fontSize="xs" textAlign="right">
                                    {recommendation.price_label}
                                  </Text>
                                )}
                              </Flex>
                            )}
                          </Flex>
                        </Flex>
                      </Link>
                    );
                  })}
                </Flex>
              )}
            </Flex>
          ))}
          {busy && (
            <Text color={colors.textMuted} fontSize="sm">
              {t.loading}
            </Text>
          )}
        </Flex>
      )}

      <form onSubmit={send}>
        <Flex direction={{ base: 'column', md: 'row' }} gap={3} align="stretch">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.placeholder}
            minH="52px"
            maxLength={4000}
            resize="vertical"
            aria-label={t.messageLabel}
          />
          <Button
            type="submit"
            disabled={
              !draft.trim() || busy || !restored || !storageKey
            }
            minW={{ md: '150px' }}
          >
            {busy ? t.sending : t.send}
          </Button>
        </Flex>
        {error && (
          <Text role="alert" mt={2} color={colors.danger} fontSize="sm">
            {error}
          </Text>
        )}
      </form>
      <Text color={colors.textMuted} fontSize="xs">
        {t.footer}
      </Text>
    </Flex>
  );
};
