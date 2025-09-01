import React from "react";
import Link from "next/link";
import { HeartIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~/components/SwitchTheme";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {/* Empty space for future additions */}
          </div>
          <SwitchTheme className="pointer-events-auto" />
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <a href="https://github.com/your-username/pandapi" target="_blank" rel="noreferrer" className="link">
                🐼 PandaPi
              </a>
            </div>
            <span>·</span>
            <div className="flex justify-center items-center gap-2">
              <p className="m-0 text-center">
                Built with <HeartIcon className="inline-block h-4 w-4" /> for streaming
              </p>
            </div>
            <span>·</span>
            <div className="text-center">
              <a href="/create-moderators" className="link">
                Create AI Moderators
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};