"use server";

import { getAppUrl } from "@/lib/app-url";
import { makeAuthenticatedRequest } from "./makeAuthenticatedRequest";

export const changeEmail = async (body: any) => {
  const test = await makeAuthenticatedRequest(
    `${getAppUrl()}/api/auth/change-email/request`,
    "POST",
    body
  );

  return JSON.parse(JSON.stringify(test));
};
