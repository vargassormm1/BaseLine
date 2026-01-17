"use client";
import { useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./Links.module.css";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { MenuOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
import { PendingMatchContext } from "../../../context/PendingMatchContext";
import { getPendingMatchesCount } from "@/utils/api";
import { useClerk } from "@clerk/nextjs";

const Links = ({ userId, currentUser }) => {
  const { signOut } = useClerk();
  const { pendingMatchChanged } = useContext(PendingMatchContext);
  const [pendingMatchCount, setPendingMatchCount] = useState(0);
  const pathName = usePathname();
  const NavbarLinks = [
    {
      name: "Home",
      path: "/home",
    },
    {
      name: "Rankings",
      path: "/rankings",
    },
    {
      name: "Players",
      path: `/players`,
    },
    {
      name: "H2H",
      path: "/h2h",
    },
    {
      name: "Pending",
      path: "/pending",
    },
    {
      name: "Profile",
      path: `/profile/${currentUser?.userId}`,
    },
  ];
  const items = userId
    ? [
        {
          label: (
            <Link
              href="/home"
              key="home"
              className={`${styles.link} ${
                pathName === "/home" ? styles.active : styles.link
              }`}
            >
              Home
            </Link>
          ),
          key: "0",
        },
        {
          label: (
            <Link
              href="/rankings"
              key="rankings"
              className={`${styles.link} ${
                pathName === "/rankings" ? styles.active : styles.link
              }`}
            >
              Rankings
            </Link>
          ),
          key: "1",
        },
        {
          label: (
            <Link
              href="/players"
              key="players"
              className={`${styles.link} ${
                pathName === "/players" ? styles.active : styles.link
              }`}
            >
              Players
            </Link>
          ),
          key: "2",
        },
        {
          label: (
            <Link
              href="/h2h"
              key="h2h"
              className={`${styles.link} ${
                pathName === "/h2h" ? styles.active : styles.link
              }`}
            >
              H2H
            </Link>
          ),
          key: "3",
        },
        {
          label: (
            <Link
              href="/pending"
              key="pending"
              className={`${styles.link} ${
                pathName === "/pending" ? styles.active : styles.link
              }`}
            >
              <div className={styles.iconWithBadge}>
                Pending
                {parseInt(pendingMatchCount) !== 0 ? (
                  <span className={styles.countBadge}>
                    {String(pendingMatchCount)}
                  </span>
                ) : (
                  <></>
                )}
              </div>
            </Link>
          ),
          key: "4",
        },
        {
          label: (
            <Link
              href={`/profile/${currentUser?.userId}`}
              key="profile"
              className={`${styles.link} ${
                pathName === `/profile/${currentUser?.userId}`
                  ? styles.active
                  : styles.link
              }`}
            >
              Profile
            </Link>
          ),
          key: "5",
        },
        {
          label: (
            <button
              className={styles.signout}
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              Sign Out
            </button>
          ),
          key: "6",
        },
      ]
    : [
        {
          label: (
            <Link
              href="/sign-in"
              key="login"
              className={`${styles.link} ${
                pathName === "/sign-in" ? styles.active : styles.link
              }`}
            >
              Login
            </Link>
          ),
          key: "1",
        },
        {
          label: (
            <Link
              href="/sign-up"
              key="register"
              className={`${styles.link} ${
                pathName === "/sign-up" ? styles.active : styles.link
              }`}
            >
              Register
            </Link>
          ),
          key: "2",
        },
      ];

  const fetchPendingMatchesCount = useCallback(async (userId) => {
    const data = await getPendingMatchesCount(userId);
    setPendingMatchCount(String(data));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPendingMatchesCount(currentUser?.userId);
    }
  }, [currentUser, fetchPendingMatchesCount, pendingMatchChanged]);

  return (
    <>
      <div className={styles.drop}>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <Dropdown
          menu={{
            items,
          }}
          className={styles.dropdown}
        >
          <a onClick={(e) => e.preventDefault()}>
            <Space className={styles.dropLinks}>
              <div className={styles.badge}>
                <MenuOutlined />
                {userId && parseInt(pendingMatchCount) !== 0 ? (
                  <span className={styles.badgeDot}></span>
                ) : null}
              </div>
            </Space>
          </a>
        </Dropdown>
      </div>
      <ul className={styles.links}>
        <SignedOut>
          <Link
            href={"/sign-in"}
            className={`${styles.link} ${
              pathName === "/sign-in" ? styles.active : styles.link
            }`}
          >
            Login
          </Link>
          <Link
            href={"/sign-up"}
            className={`${styles.link} ${
              pathName === "/sign-up" ? styles.active : styles.link
            }`}
          >
            Sign Up
          </Link>
        </SignedOut>
        <SignedIn>
          <>
            {NavbarLinks.map((link) => (
              <Link
                prefetch={true}
                href={link.path}
                key={link.name}
                className={`${styles.link} ${
                  pathName === link.path ? styles.active : styles.link
                }`}
              >
                {link.name === "Pending" ? (
                  <div className={styles.iconWithBadge}>
                    {link.name}
                    {parseInt(pendingMatchCount) !== 0 && (
                      <span className={styles.countBadge}>
                        {pendingMatchCount}
                      </span>
                    )}
                  </div>
                ) : (
                  link.name
                )}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/" />
          </>
        </SignedIn>
      </ul>
    </>
  );
};
export default Links;
