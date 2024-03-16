"use client";
import Link from "next/link";
import styles from "./Links.module.css";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NavbarLinks = [
  {
    name: "Home",
    path: "/home",
  },
  {
    name: "Rankings",
    path: "/rankings",
  },
];

const Links = ({ userId }) => {
  const pathName = usePathname();
  return (
    <ul className={styles.links}>
      {userId ? (
        <>
          {NavbarLinks.map((link) => (
            <Link
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
  );
};
export default Links;
