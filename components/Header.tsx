"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "~/contexts/AuthContext";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: 'Home',
    href: '/'
  },
  {
    label: 'Streams',
    href: '/streams'
  },
  {
    label: 'Create Stream',
    href: '/create'
  },
  {
    label: 'Create Moderators',
    href: '/create-moderators'
  }
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-purple-600 shadow-md text-white" : "text-gray-800 dark:text-white"
              } hover:bg-purple-600 hover:shadow-md hover:text-white focus:!bg-purple-600 focus:!text-white active:!text-white py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-colors font-medium`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { user, userProfile, logout } = useAuth();

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);

  return (
    <div className="sticky lg:static top-0 navbar bg-white border-b border-gray-200 min-h-0 shrink-0 justify-between z-20 shadow-sm px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-white border border-gray-200 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex items-center">
            <span className="text-2xl">🐼</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">PandaPi</span>
            <span className="text-xs text-gray-500">AI-Moderated Streaming</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4 flex items-center gap-4">
        {user && userProfile && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-8 rounded-full flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600">
                <span className="text-white text-sm font-semibold">
                  {userProfile.displayName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white border border-gray-200 rounded-box w-52">
              <li className="menu-title">
                <span className="text-gray-900 font-semibold">{userProfile.displayName}</span>
              </li>
              <li><a className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">Profile</a></li>
              <li><a className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">Settings</a></li>
              <li><a onClick={logout} className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">Logout</a></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};