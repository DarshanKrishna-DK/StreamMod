# StreamMod - Twitch Chat Moderation Dashboard

A powerful, real-time Twitch chat moderation platform built with Next.js, Scaffold-ETH 2, and blockchain integration.

## 🚀 Features

- **Real-time Twitch Chat Monitoring** - Live chat feed with IRC integration
- **Smart Moderation Tools** - Advanced filtering and moderation capabilities  
- **Multi-Platform Support** - Twitch, YouTube, and custom streaming platforms
- **Blockchain Integration** - Built on Scaffold-ETH 2 framework
- **Modern UI** - Clean, responsive interface for moderators
- **Secure Authentication** - OAuth integration with Twitch

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, TailwindCSS
- **Blockchain**: Scaffold-ETH 2, Hardhat, Wagmi, RainbowKit
- **Real-time**: Socket.IO, Twitch IRC
- **Authentication**: Twitch OAuth, Firebase (optional)
- **APIs**: Twitch API, YouTube API (optional)

## 📋 Prerequisites

- Node.js 18+ and Yarn
- Twitch Developer Account
- Git

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/DarshanKrishna-DK/StreamMod.git
cd StreamMod
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Setup Environment Variables
```bash
# Copy environment template
cp packages/nextjs/env.example packages/nextjs/.env.local
```

Edit `packages/nextjs/.env.local` with your credentials:
```env
# Required: Get from https://dev.twitch.tv/console
NEXT_PUBLIC_TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Optional: Other integrations...
```

### 4. Get Twitch API Credentials

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Set OAuth Redirect URL: `http://localhost:3000/auth/twitch/callback`
4. Copy Client ID and generate Client Secret
5. Add them to your `.env.local` file

### 5. Start Development Server
```bash
# Terminal 1: Start local blockchain
yarn chain

# Terminal 2: Deploy contracts  
yarn deploy

# Terminal 3: Start frontend
yarn start
```

Visit `http://localhost:3000` to see the application!

## 🎯 Usage

### For Streamers
1. **Connect Twitch Account** - Authenticate via OAuth
2. **Enter Channel Name** - Input your Twitch channel 
3. **Start Monitoring** - Real-time chat feed begins
4. **Moderate Content** - Use built-in moderation tools

### For Developers
1. **Smart Contracts** - Modify contracts in `packages/hardhat/contracts/`
2. **Frontend Components** - Edit UI in `packages/nextjs/app/`
3. **API Integration** - Extend APIs in `packages/nextjs/lib/`
4. **Deploy** - Use `yarn deploy` for contracts, `yarn vercel` for frontend

## 📁 Project Structure

```
StreamMod/
├── packages/
│   ├── hardhat/          # Smart contracts & deployment
│   │   ├── contracts/    # Solidity contracts
│   │   ├── deploy/       # Deployment scripts
│   │   └── test/         # Contract tests
│   └── nextjs/           # Frontend application
│       ├── app/          # Next.js app router pages
│       ├── components/   # React components
│       ├── lib/          # API services & utilities
│       └── hooks/        # Custom React hooks
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Security Notes

- **Never commit `.env.local` files** - Contains sensitive API keys
- **Regenerate Twitch Client Secret** - If accidentally exposed
- **Use environment variables** - All credentials should be in `.env.local`
- **Review `.gitignore`** - Ensures sensitive files aren't tracked

## 🚀 Deployment

### Frontend (Vercel)
```bash
yarn vercel
```

### Smart Contracts
```bash
# Deploy to testnet/mainnet
yarn deploy --network <network_name>
```

### Environment Variables for Production
Set these in your deployment platform:
- `NEXT_PUBLIC_TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- Other optional integrations...

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/DarshanKrishna-DK/StreamMod/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DarshanKrishna-DK/StreamMod/discussions)
- **Documentation**: [Scaffold-ETH 2 Docs](https://docs.scaffoldeth.io)

## 🔗 Links

- [Twitch Developer Console](https://dev.twitch.tv/console)
- [Scaffold-ETH 2](https://scaffoldeth.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

---

Built with ❤️ using Scaffold-ETH 2