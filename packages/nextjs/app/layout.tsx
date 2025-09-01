
import "@rainbow-me/rainbowkit/styles.css";
import { PandaPiAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

export const metadata = {
  title: 'PandaPi - AI-Moderated Streaming Platform',
  description: 'Decentralized streaming platform with AI-powered moderation on Avalanche'
};

const PandaPiApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <body>
        <ThemeProvider enableSystem>
          <PandaPiAppWithProviders>{children}</PandaPiAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default PandaPiApp;