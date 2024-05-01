import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/utils/db";

const createNewUser = async () => {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const match = await prisma.user.findUnique({
    where: {
      clerkId: user?.id,
      email: user?.emailAddresses[0].emailAddress,
    },
  });

  if (!match) {
    await prisma.user.create({
      data: {
        clerkId: user?.id,
        fname: user?.firstName,
        lname: user?.lastName,
        username: user?.username,
        email: user?.emailAddresses[0].emailAddress,
        imageUrl: user?.imageUrl,
      },
    });
  }

  redirect("/home");
};

const NewUser = async () => {
  await createNewUser();
  return <div>...loading</div>;
};

export default NewUser;
