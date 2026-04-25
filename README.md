# AI Receptionist (Voice Agent)

A sophisticated AI-powered voice receptionist system that provides intelligent, conversational responses for business communications. This full-stack application combines speech-to-text, natural language processing, and text-to-speech technologies to create a seamless voice interaction experience.

## 🚀 Features

### Core Functionality
- **Real-time Voice Conversations**: WebSocket-based bidirectional voice communication
- **Speech-to-Text**: Multiple STT providers (OpenAI Whisper, Deepgram, local Vosk model)
- **AI-Powered Responses**: Intelligent conversation handling with configurable business context
- **Text-to-Speech**: High-quality voice synthesis using ElevenLabs
- **Conversation Persistence**: PostgreSQL database for storing conversation history and caller details

### Business Intelligence
- **Configurable Business Context**: Customizable receptionist persona, business hours, services
- **Multi-Provider AI Support**: Ollama (local), OpenAI, OpenRouter, Grok, and more
- **Professional Tone Management**: Configurable conversation rules and tone guidelines
- **Service-Specific Handling**: Appointment scheduling, visitor reception, message taking

### Technical Features
- **Real-time WebSocket Communication**: Low-latency voice processing
- **File Upload Handling**: Secure audio file processing with automatic cleanup
- **Error Handling & Validation**: Comprehensive error management and response validation
- **Health Monitoring**: Built-in health check endpoints
- **CORS Support**: Configurable cross-origin resource sharing

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: PostgreSQL with pg driver
- **Real-time**: WebSockets (ws library)
- **Authentication**: JWT (jsonwebtoken)
- **File Handling**: Multer for uploads
- **Audio Processing**: ffmpeg-static

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS modules
- **HTTP Client**: Axios
- **Real-time**: WebSocket client

### AI & Speech Services
- **Speech-to-Text**: OpenAI Whisper, Deepgram, Vosk (offline)
- **AI Models**: Ollama (local), OpenAI GPT, OpenRouter, Grok
- **Text-to-Speech**: ElevenLabs

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn** package manager
- **ffmpeg** (for audio processing)

### Optional Prerequisites
- **Ollama** (for local AI models)
- **Vosk model** (for offline speech recognition)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "AI Receptionist (Voice Agent)"
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd Client
   npm install
   cd ..
   ```

4. **Install server dependencies**
   ```bash
   cd Server
   npm install
   cd ..
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `Server` directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/receptionist_db

# AI Providers (choose one or more)
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
GROK_API_KEY=your_grok_api_key
GROK_MODEL=grok-4.20-beta-latest-non-reasoning

# Speech Services
OPENAI_TTS_API_KEY=your_openai_tts_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
DEEPGRAM_API_KEY=your_deepgram_key

# Business Configuration
BUSINESS_NAME=Horizon Business Centre
RECEPTIONIST_NAME=Alex
BUSINESS_HOURS=Monday to Friday, 8 AM to 5 PM
SERVICES_OFFERED=appointment scheduling,visitor reception,call message taking,general enquiries
TONE_RULES=Warm, concise, professional, and natural for phone conversations.
COMPANY_RULES=Do not promise unavailable times, do not invent pricing or policies, and collect callback details when needed.
```

### Database Setup

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE receptionist_db;
   ```

2. **Run migrations**
   ```bash
   cd Server
   # Run the migration file manually or use a migration tool
   psql -d receptionist_db -f db/migrations/001_create_conversation_schema.sql
   ```

### Optional: Local AI Setup

1. **Install Ollama**
   ```bash
   # Download from https://ollama.ai/
   ```

2. **Pull a model**
   ```bash
   ollama pull llama3.2:1b
   ```

### Optional: Offline Speech Recognition

The Vosk model is already included in `Server/models/vosk-model-small-en-us-0.15/`.

## 🚀 Running the Application

### Development Mode

1. **Start the server**
   ```bash
   cd Server
   npm run dev
   ```

2. **Start the client** (in a new terminal)
   ```bash
   cd Client
   npm run dev
   ```

3. **Access the application**
   - Client: http://localhost:5173
   - Server API: http://localhost:3000

### Production Mode

1. **Build the client**
   ```bash
   cd Client
   npm run build
   ```

2. **Start the server**
   ```bash
   cd Server
   npm start
   ```

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Speech-to-Text
- `POST /api/transcribe` - Transcribe audio file (multipart/form-data)

### AI Processing
- `POST /api/ai/generate-reply` - Generate AI response

### Text-to-Speech
- `POST /api/tts/generate` - Generate speech from text
- `GET /audio/:filename` - Serve generated audio files

### Real-time WebSocket
- `ws://localhost:3000` - WebSocket connection for real-time voice conversations

## 💾 Database Schema

### Tables

#### `conversations`
- Stores conversation sessions
- Fields: id, session_id, business_name, receptionist_name, channel, status, timestamps

#### `conversation_messages`
- Stores individual messages in conversations
- Fields: id, conversation_id, role, content, content_type, sequence_number, metadata, timestamps

#### `caller_details`
- Stores caller information collected during conversations
- Fields: id, conversation_id, caller_name, phone_number, requested_service, etc.

## 🎯 Usage

### Basic Voice Interaction

1. Open the client application
2. Click "Start Recording" to begin voice input
3. Speak your message
4. The system will:
   - Transcribe your speech
   - Generate an AI response
   - Convert the response to speech
   - Play the audio reply

### API Usage Examples

#### Transcribe Audio
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@audio_file.wav" \
  -H "Content-Type: multipart/form-data"
```

#### Generate AI Reply
```bash
curl -X POST http://localhost:3000/api/ai/generate-reply \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I would like to schedule an appointment"}'
```

#### Generate Speech
```bash
curl -X POST http://localhost:3000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello! How can I help you today?"}'
```

## 🔧 Development

### Project Structure

```
AI Receptionist (Voice Agent)/
├── Client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── realtime/
│   ├── package.json
│   └── vite.config.js
├── Server/                 # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── realtime/
│   │   └── utils/
│   ├── db/
│   │   └── migrations/
│   ├── models/             # Vosk speech model
│   ├── outputs/            # Generated audio files
│   ├── uploads/            # Temporary audio uploads
│   └── package.json
├── package.json
└── README.md
```

### Adding New Features

1. **Backend Services**: Add new services in `Server/src/services/`
2. **API Routes**: Add routes in `Server/src/routes/`
3. **Frontend Components**: Add components in `Client/src/components/`
4. **Real-time Events**: Update socket handlers in `Server/src/realtime/`

### Testing

```bash
# Run client tests
cd Client
npm test

# Server testing (no automated tests configured yet)
cd Server
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Use ES6+ syntax
- Follow consistent naming conventions
- Add JSDoc comments for functions
- Handle errors appropriately
- Write clean, readable code

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for Whisper STT and GPT models
- **ElevenLabs** for high-quality TTS
- **Ollama** for local AI model hosting
- **Vosk** for offline speech recognition
- **React & Vite** for the frontend framework

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Note**: This application requires API keys for various AI and speech services. Ensure you have valid subscriptions and comply with each service's terms of use and pricing.</content>
<parameter name="filePath">c:\Users\Richard\OneDrive\Documents\learnng\projects\AI Receptionist (Voice Agent)\README.md