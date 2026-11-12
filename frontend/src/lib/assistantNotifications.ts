import { createSlice, type Middleware, type PayloadAction } from '@reduxjs/toolkit';
import { signedOut } from './auth';

type BookingNotification = { userId: string; bookingId: string };
type AssistantNotificationsState = { bookings: BookingNotification[] };

const initialState: AssistantNotificationsState = { bookings: [] };
const storageKey = (userId: string) => `ota_booking_notifications_v1:${userId}`;

export const loadBookingNotifications = (userId: string): BookingNotification[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as unknown;
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((bookingId): bookingId is string => typeof bookingId === 'string' && bookingId.length > 0)
      .map((bookingId) => ({ userId, bookingId }));
  } catch {
    return [];
  }
};

const assistantNotificationsSlice = createSlice({
  name: 'assistantNotifications',
  initialState,
  reducers: {
    bookingCreatedNotification: (state, action: PayloadAction<BookingNotification>) => {
      if (!state.bookings.some(({ bookingId }) => bookingId === action.payload.bookingId)) {
        state.bookings.push(action.payload);
      }
    },
    bookingNotificationsViewed: (state, action: PayloadAction<string>) => {
      state.bookings = state.bookings.filter(({ userId }) => userId !== action.payload);
    },
    bookingNotificationsRestored: (
      state,
      action: PayloadAction<{ userId: string; bookings: BookingNotification[] }>
    ) => {
      const { userId, bookings } = action.payload;
      state.bookings = [
        ...state.bookings.filter((notice) => notice.userId !== userId),
        ...bookings.filter(
          (notice, index) =>
            notice.userId === userId &&
            bookings.findIndex((candidate) => candidate.bookingId === notice.bookingId) === index
        ),
      ];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(signedOut, () => initialState);
  },
});

export const {
  bookingCreatedNotification,
  bookingNotificationsViewed,
  bookingNotificationsRestored,
} = assistantNotificationsSlice.actions;
export const assistantNotificationsReducer = assistantNotificationsSlice.reducer;

export const assistantNotificationsPersistence: Middleware = ({ getState }) => (next) => (action) => {
  const result = next(action);
  const userId = bookingCreatedNotification.match(action)
    ? action.payload.userId
    : bookingNotificationsViewed.match(action)
      ? action.payload
      : null;
  if (userId && typeof localStorage !== 'undefined') {
    try {
      const state = getState() as { assistantNotifications: AssistantNotificationsState };
      const bookingIds = state.assistantNotifications.bookings
        .filter((notice) => notice.userId === userId)
        .map((notice) => notice.bookingId);
      localStorage.setItem(storageKey(userId), JSON.stringify(bookingIds));
    } catch {
      // Notifications remain available for the current session if storage is unavailable.
    }
  }
  return result;
};
