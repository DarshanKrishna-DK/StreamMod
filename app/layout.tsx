import { PandaPiAppWithProviders } from "~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~/components/ThemeProvider";
import "~/styles/globals.css";

export const metadata = {
  title: 'PandaPi - AI-Moderated Streaming Platform',
  description: 'Live streaming platform with AI-powered moderation'
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