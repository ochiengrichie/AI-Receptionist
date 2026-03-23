# Migrations

This folder defines the Postgres schema for persistent conversation history.

## Tables

### `conversations`
- One row per call or voice session.
- Stores the public `session_id` used by the frontend and the overall state of the conversation.

Columns:
- `id`: internal UUID primary key.
- `session_id`: stable external session identifier from the app.
- `business_name`: business context used for that session.
- `receptionist_name`: receptionist persona used for that session.
- `channel`: communication channel, currently `voice`.
- `status`: `active`, `completed`, or `abandoned`.
- `started_at`: when the conversation began.
- `last_message_at`: timestamp of the latest message.
- `ended_at`: optional end timestamp.
- `created_at`: row creation timestamp.
- `updated_at`: row update timestamp.

### `conversation_messages`
- One row per message inside a conversation.
- Stores user transcripts, assistant replies, and optional system messages.

Columns:
- `id`: message UUID primary key.
- `conversation_id`: foreign key to `conversations.id`.
- `role`: `system`, `user`, or `assistant`.
- `content`: plain text message content.
- `content_type`: `text`, `transcript`, or `tts_reply`.
- `sequence_number`: message order inside the conversation.
- `language`: optional detected language for transcript messages.
- `duration_seconds`: optional audio duration for transcript messages.
- `validation_issues`: JSON array of any rule-check issues found for assistant replies.
- `metadata`: extra structured payload such as segments, model info, or response details.
- `created_at`: row creation timestamp.

### `caller_details`
- One row per conversation when caller information is collected.
- Holds the receptionist-specific structured details the AI is expected to gather.

Columns:
- `id`: UUID primary key.
- `conversation_id`: unique foreign key to `conversations.id`.
- `caller_name`: caller name.
- `phone_number`: callback number.
- `requested_service`: service requested by caller.
- `preferred_time`: requested appointment or callback time.
- `reason_for_call`: stated reason.
- `notes`: extra receptionist notes.
- `created_at`: row creation timestamp.
- `updated_at`: row update timestamp.

## Relationships

- `conversations` 1 -> many `conversation_messages`
- `conversations` 1 -> 0 or 1 `caller_details`

## Flow Mapping

- A new voice interaction creates or reuses a row in `conversations`.
- Every transcript and AI reply is appended to `conversation_messages`.
- When enough information is captured, extracted caller fields are written into `caller_details`.
