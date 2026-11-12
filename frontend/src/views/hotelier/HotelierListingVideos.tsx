'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  Box,
  Dialog,
  Flex,
  Grid,
  Image,
  Portal,
  Stack,
  Text,
  chakra,
} from '@chakra-ui/react';
import {
  getErrorMessage,
  useDeleteHotelierListingVideoMutation,
  useGetHotelierListingVideosQuery,
  useUpdateHotelierListingVideoMutation,
  useUploadHotelierListingVideoMutation,
  type HotelierListingVideo,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { IconButton } from '@/shared/icon-button/IconButton';
import { Input } from '@/shared/input';

const VideoPlayerModal = ({
  video,
  onClose,
  lang,
}: {
  video: HotelierListingVideo;
  onClose: () => void;
  lang: 'ru' | 'en';
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }

    let destroyed = false;
    let hlsInstance: import('hls.js').default | null = null;

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = video.stream_url;
      void el.play().catch(() => {});
    } else {
      void import('hls.js').then(({ default: Hls }) => {
        if (destroyed || !el) {
          return;
        }
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 10 });
          hlsInstance = hls;
          hls.loadSource(video.stream_url);
          hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            void el.play().catch(() => {});
          });
        }
      });
    }

    return () => {
      destroyed = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      el.pause();
      el.removeAttribute('src');
      el.load();
    };
  }, [video.stream_url]);

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            w="540px"
            maxW="calc(100vw - 24px)"
            borderRadius="16px"
            overflow="hidden"
            bg="black"
            color="white"
            p="0"
          >
            <Flex justify="space-between" align="center" px="16px" py="12px" bg="#1c1c1e">
              <Box minW="0" pr="12px">
                <Text fontSize="15px" fontWeight="600" truncate>
                  {video.title || t('Видеоролик', 'Video clip')}
                </Text>
                {video.subtitle && (
                  <Text fontSize="12px" color="gray.400" truncate>
                    {video.subtitle}
                  </Text>
                )}
              </Box>
              <IconButton
                label={t('Закрыть', 'Close')}
                onClick={onClose}
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                w="32px"
                h="32px"
                borderRadius="full"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </IconButton>
            </Flex>
            <Box position="relative" bg="black" minH="300px" maxH="75vh" display="flex" justifyContent="center">
              <video
                ref={videoRef}
                controls
                playsInline
                poster={video.preview_url}
                style={{
                  maxHeight: '75vh',
                  width: '100%',
                  objectFit: 'contain',
                }}
              />
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export const HotelierListingVideos = ({
  listingId,
  lang,
}: {
  listingId: string;
  lang: 'ru' | 'en';
}) => {
  const { data: videos = [], isLoading, isError, refetch } = useGetHotelierListingVideosQuery(listingId);
  const [uploadVideo, uploadState] = useUploadHotelierListingVideoMutation();
  const [deleteVideo, deleteState] = useDeleteHotelierListingVideoMutation();
  const [updateVideo] = useUpdateHotelierListingVideoMutation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<HotelierListingVideo | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedFile(file);
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError(t('Пожалуйста, выберите видеофайл для загрузки.', 'Please choose a video file to upload.'));
      return;
    }

    setUploadError('');
    const formData = new FormData();
    formData.append('video', selectedFile);
    if (title.trim()) {
      formData.append('title', title.trim());
    }
    if (subtitle.trim()) {
      formData.append('subtitle', subtitle.trim());
    }

    try {
      const result = await uploadVideo({ listingId, formData }).unwrap();
      if (result) {
        setSelectedFile(null);
        setTitle('');
        setSubtitle('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setUploadError(
        getErrorMessage(err) ||
          t(
            'Ошибка при загрузке или кодировании видеоролика. Попробуйте другой файл.',
            'Failed to upload or transcode the video. Please try another file.'
          )
      );
    }
  };

  const handleDelete = async (videoId: string) => {
    setDeletingId(videoId);
    try {
      await deleteVideo({ listingId, videoId }).unwrap();
      setConfirmDeleteId(null);
    } catch (err) {
      alert(
        getErrorMessage(err) ||
          t('Не удалось удалить видеоролик.', 'Could not delete the video clip.')
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (video: HotelierListingVideo) => {
    try {
      await updateVideo({
        listingId,
        videoId: video.id,
        body: { is_active: !video.is_active },
      }).unwrap();
    } catch (err) {
      alert(
        getErrorMessage(err) ||
          t('Не удалось изменить статус видеоролика.', 'Could not update video status.')
      );
    }
  };

  return (
    <Stack gap="18px">
      <Flex align="center" justify="space-between" wrap="wrap" gap="8px">
        <Box>
          <Flex align="center" gap="8px">
            <Text fontSize="15px" fontWeight="600">
              {t('Видеоролики объекта', 'Property videos')}
            </Text>
            <Box
              as="span"
              px="7px"
              py="1px"
              borderRadius="full"
              bg="#eaf2ff"
              color="#0757c7"
              fontSize="12px"
              fontWeight="600"
            >
              {videos.length}
            </Box>
          </Flex>
          <Text fontSize="13px" color="fg.muted" mt="2px">
            {t(
              'Ролики транслируются в ленте рекомендаций и в карточке объекта. Загруженное видео автоматически нарезается в HLS для плавного стриминга.',
              'Clips appear in the recommendations feed and the property card. Videos are automatically transcoded to HLS for smooth streaming.'
            )}
          </Text>
        </Box>
      </Flex>

      {/* Форма загрузки нового видео */}
      <Box
        p="16px"
        bg="#f8f9fb"
        border="1px solid"
        borderColor="#e5e5ea"
        borderRadius="12px"
      >
        <chakra.form onSubmit={handleUpload}>
          <Text fontSize="14px" fontWeight="600" mb="10px">
            {t('Загрузить новый видеоролик', 'Upload new video')}
          </Text>

          <Stack gap="12px">
            <Box
              as="label"
              position="relative"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              p="18px"
              border="1px dashed"
              borderColor={selectedFile ? 'blue.400' : 'gray.300'}
              borderRadius="10px"
              bg={selectedFile ? 'blue.50' : 'white'}
              cursor="pointer"
              transition="all 120ms ease"
              _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
            >
              <Box color="#0757c7" mb="6px">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 10l5-3v10l-5-3v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4z" />
                </svg>
              </Box>
              <Text fontSize="14px" fontWeight="600" color="gray.800" textAlign="center">
                {selectedFile
                  ? selectedFile.name
                  : t('Нажмите, чтобы выбрать видеофайл', 'Click to select a video file')}
              </Text>
              <Text fontSize="12px" color="fg.muted" mt="2px">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} МБ`
                  : t('MP4, MOV, WebM · вертикальные или обзорные ролики', 'MP4, MOV, WebM · vertical or overview clips')}
              </Text>
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*,video/mp4,video/quicktime,video/webm"
                position="absolute"
                inset="0"
                opacity="0"
                cursor="pointer"
                disabled={uploadState.isLoading}
                onChange={handleFileChange}
              />
            </Box>

            {selectedFile && (
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap="10px">
                <Box>
                  <Text fontSize="12px" color="gray.600" mb="4px">
                    {t('Название ролика', 'Video title')}
                  </Text>
                  <Input
                    size="sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('Например: Обзор номера делюкс', 'E.g.: Deluxe room tour')}
                    disabled={uploadState.isLoading}
                  />
                </Box>
                <Box>
                  <Text fontSize="12px" color="gray.600" mb="4px">
                    {t('Подзаголовок / Описание (опционально)', 'Subtitle (optional)')}
                  </Text>
                  <Input
                    size="sm"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder={t('Например: Вид на горы, джакузи', 'E.g.: Mountain view, jacuzzi')}
                    disabled={uploadState.isLoading}
                  />
                </Box>
              </Grid>
            )}

            {uploadError && (
              <Text role="alert" color="red.600" fontSize="13px">
                {uploadError}
              </Text>
            )}

            {uploadState.isLoading && (
              <Flex align="center" gap="10px" p="10px 14px" bg="blue.50" borderRadius="8px">
                <Box
                  w="16px"
                  h="16px"
                  border="2px solid"
                  borderColor="blue.600"
                  borderTopColor="transparent"
                  borderRadius="full"
                  animation="spin 0.8s linear infinite"
                  flexShrink="0"
                />
                <Text fontSize="13px" color="blue.800">
                  {t(
                    'Загружаем и нарезаем видео в HLS (FFmpeg)... Это может занять несколько секунд.',
                    'Uploading and transcoding into HLS (FFmpeg)... This may take a few seconds.'
                  )}
                </Text>
              </Flex>
            )}

            <Flex justify="flex-end" gap="8px">
              {selectedFile && !uploadState.isLoading && (
                <Button
                  type="button"
                  size="sm"
                  appearance="soft"
                  onClick={() => {
                    setSelectedFile(null);
                    setTitle('');
                    setSubtitle('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  {t('Отмена', 'Cancel')}
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!selectedFile || uploadState.isLoading}
                loading={uploadState.isLoading}
              >
                {t('Загрузить ролик', 'Upload clip')}
              </Button>
            </Flex>
          </Stack>
        </chakra.form>
      </Box>

      {/* Список загруженных роликов */}
      {isLoading ? (
        <Flex justify="center" py="24px">
          <Text fontSize="14px" color="fg.muted">
            {t('Загрузка видеороликов...', 'Loading videos...')}
          </Text>
        </Flex>
      ) : isError ? (
        <Flex align="center" justify="space-between" p="14px" bg="red.50" borderRadius="10px">
          <Text fontSize="13px" color="red.700">
            {t('Не удалось загрузить список видеороликов.', 'Failed to load video clips.')}
          </Text>
          <Button type="button" size="xs" appearance="soft" onClick={() => void refetch()}>
            {t('Повторить', 'Retry')}
          </Button>
        </Flex>
      ) : videos.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py="28px"
          px="16px"
          border="1px dashed"
          borderColor="#e5e5ea"
          borderRadius="12px"
          bg="#fafafa"
        >
          <Box color="gray.400" mb="8px">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m10 9 5 3-5 3V9z" />
            </svg>
          </Box>
          <Text fontSize="14px" fontWeight="600" color="gray.700">
            {t('Пока нет добавленных видеороликов', 'No video clips added yet')}
          </Text>
          <Text fontSize="13px" color="fg.muted" mt="2px" textAlign="center" maxW="380px">
            {t(
              'Загрузите первый ролик выше, чтобы он отображался в мобильной ленте гостей и привлекал больше бронирований.',
              'Upload the first video above so it appears in the guest mobile feed and drives more bookings.'
            )}
          </Text>
        </Flex>
      ) : (
        <Grid
          templateColumns={{
            base: 'repeat(auto-fill, minmax(160px, 1fr))',
            sm: 'repeat(auto-fill, minmax(180px, 1fr))',
          }}
          gap="14px"
        >
          {videos.map((video) => {
            const isDeleting = deletingId === video.id;
            const isConfirming = confirmDeleteId === video.id;

            return (
              <Box
                key={video.id}
                border="1px solid"
                borderColor="#e5e5ea"
                borderRadius="12px"
                overflow="hidden"
                bg="white"
                display="flex"
                flexDirection="column"
                boxShadow="0 1px 3px rgba(0,0,0,0.04)"
                transition="transform 120ms ease, box-shadow 120ms ease"
                _hover={{ boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}
              >
                {/* Превью ролика с кнопкой воспроизведения */}
                <Box
                  position="relative"
                  w="100%"
                  aspectRatio="9 / 14"
                  bg="gray.900"
                  cursor="pointer"
                  onClick={() => setPlayingVideo(video)}
                  role="button"
                  aria-label={`${t('Смотреть видео', 'Play video')} ${video.title}`}
                >
                  <Image
                    src={video.preview_url}
                    alt={video.title || t('Превью ролика', 'Video preview')}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                  {/* Оверлей с градиентом и иконкой Play */}
                  <Flex
                    position="absolute"
                    inset="0"
                    align="center"
                    justify="center"
                    bg="rgba(0,0,0,0.25)"
                    transition="background 120ms ease"
                    _hover={{ bg: 'rgba(0,0,0,0.15)' }}
                  >
                    <Flex
                      w="42px"
                      h="42px"
                      borderRadius="full"
                      bg="rgba(255,255,255,0.92)"
                      color="gray.900"
                      align="center"
                      justify="center"
                      boxShadow="0 2px 8px rgba(0,0,0,0.3)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </Flex>
                  </Flex>

                  {/* Бейдж статуса */}
                  <Box
                    position="absolute"
                    top="8px"
                    left="8px"
                    px="7px"
                    py="2px"
                    borderRadius="full"
                    fontSize="11px"
                    fontWeight="600"
                    bg={video.is_active ? 'green.600' : 'gray.700'}
                    color="white"
                  >
                    {video.is_active ? t('Активен', 'Active') : t('Скрыт', 'Hidden')}
                  </Box>
                </Box>

                {/* Метаданные и действия */}
                <Stack p="10px" gap="6px" flex="1" justify="space-between">
                  <Box minW="0">
                    <Text fontSize="13px" fontWeight="600" color="gray.900" truncate title={video.title}>
                      {video.title || t('Без названия', 'Untitled')}
                    </Text>
                    {video.subtitle && (
                      <Text fontSize="11px" color="fg.muted" truncate title={video.subtitle}>
                        {video.subtitle}
                      </Text>
                    )}
                    <Text fontSize="11px" color="gray.400" mt="2px">
                      {new Date(video.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')}
                    </Text>
                  </Box>

                  {/* Кнопки управления роликом */}
                  <Stack gap="6px" pt="4px" borderTop="1px solid" borderColor="gray.100">
                    {isConfirming ? (
                      <Stack gap="4px" bg="red.50" p="6px" borderRadius="8px">
                        <Text fontSize="11px" color="red.700" fontWeight="600" textAlign="center">
                          {t('Удалить видео?', 'Delete video?')}
                        </Text>
                        <Flex gap="4px">
                          <Button
                            type="button"
                            size="xs"
                            appearance="soft"
                            flex="1"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t('Нет', 'No')}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            color="red.700"
                            bg="red.100"
                            _hover={{ bg: 'red.200' }}
                            flex="1"
                            loading={isDeleting}
                            onClick={() => void handleDelete(video.id)}
                          >
                            {t('Да', 'Yes')}
                          </Button>
                        </Flex>
                      </Stack>
                    ) : (
                      <Flex gap="6px">
                        <Button
                          type="button"
                          size="xs"
                          appearance="soft"
                          flex="1"
                          onClick={() => void handleToggleActive(video)}
                          fontSize="11px"
                        >
                          {video.is_active ? t('Скрыть', 'Hide') : t('Показать', 'Show')}
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          appearance="soft"
                          color="red.600"
                          _hover={{ bg: 'red.50' }}
                          onClick={() => setConfirmDeleteId(video.id)}
                          fontSize="11px"
                        >
                          {t('Удалить', 'Delete')}
                        </Button>
                      </Flex>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      )}

      {/* Модальное окно предпросмотра воспроизведения */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          lang={lang}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </Stack>
  );
};
