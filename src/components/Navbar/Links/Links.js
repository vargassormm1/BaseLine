"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./Links.module.css";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MenuOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";

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
    name: "H2H",
    path: "/h2h",
  },
];

const Links = ({ userId }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathName = usePathname();
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
              href="/h2h"
              key="h2h"
              className={`${styles.link} ${
                pathName === "/h2h" ? styles.active : styles.link
              }`}
            >
              Rankings
            </Link>
          ),
          key: "1",
        },
      ]
    : [
        {
          label: (
            <Link
              href="/login"
              key="login"
              className={`${styles.link} ${
                pathName === "/login" ? styles.active : styles.link
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
              href="/register"
              key="register"
              className={`${styles.link} ${
                pathName === "/register" ? styles.active : styles.link
              }`}
            >
              Register
            </Link>
          ),
          key: "2",
        },
      ];
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  return (
    <>
      <div className={styles.drop}>
        <Dropdown
          menu={{
            items,
          }}
          className={styles.dropdown}
        >
          <a onClick={(e) => e.preventDefault()}>
            <Space className={styles.dropLinks}>
              <MenuOutlined />
            </Space>
          </a>
        </Dropdown>
        <UserButton afterSignOutUrl="/" />
      </div>
      <ul className={styles.links}>
        {userId ? (
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
                {link.name}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <>
            <Link
              href={"/login"}
              className={`${styles.link} ${
                pathName === "/login" ? styles.active : styles.link
              }`}
            >
              Login
            </Link>
            <Link
              href={"/register"}
              className={`${styles.link} ${
                pathName === "/register" ? styles.active : styles.link
              }`}
            >
              Sign Up
            </Link>
          </>
        )}
      </ul>
    </>
  );
};
export default Links;
