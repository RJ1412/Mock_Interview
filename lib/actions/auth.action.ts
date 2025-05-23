"use server";

// Server actions using the admin SDK

import { adminAuth, adminDB } from "@/firebase/admin";
import { FirebaseError } from "firebase/app";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7;

export async function signUpAction(params: SignUpParams) {
  const { uid, name, email, password } = params;

  try {
    const userRecord = await adminDB.collection("users").doc(uid).get();

    if (userRecord.exists) {
      return {
        success: false,
        message:
          "A user with the given credentials already exists! Please sign in instead.",
      };
    }

    await adminDB.collection("users").doc(uid).set({
      name,
      email,
      password,
    });

    return {
      success: true,
      message: "Account created successfully! Please sign in.",
    };
  } catch (err) {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/email-already-exists":
          return {
            success: false,
            message: "The email is already in use!",
          };
        default:
          return {
            success: false,
            message: err.message,
          };
      }
    }

    const errMsg =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred while signing up the user!";

    console.error("Sign-up Action Error:", errMsg);

    return {
      success: false,
      message: errMsg,
    };
  }
}

async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK * 1000,
  });

  await cookieStore.set("session", sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signInAction(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await adminAuth.getUserByEmail(email);

    if (!userRecord) {
      return {
        success: false,
        message:
          "No user exists with the given email! Create an account instead.",
      };
    }

    await setSessionCookie(idToken);

    return {
      success: true,
      message: "Signed in successfully!",
    };
  } catch (err) {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/user-not-found":
          return {
            success: false,
            message: "No account found with this email! Please sign up.",
          };
        case "auth/invalid-email":
          return {
            success: false,
            message: "Invalid email format! Please check and try again.",
          };
        case "auth/invalid-credential":
          return {
            success: false,
            message:
              "Invalid credentials! Please check your email and password.",
          };
        case "auth/too-many-requests":
          return {
            success: false,
            message: "Too many login attempts! Please try again later.",
          };
        default:
          console.error("Unhandled Firebase Error:", err);

          return {
            success: false,
            message:
              err.message ||
              "An unexpected Firebase authentication error occurred!",
          };
      }
    }

    const errMsg =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred while signing in the user!";

    console.error("Sign-in Action Error:", errMsg);

    return {
      success: false,
      message: errMsg,
    };
  }
}

export async function getUserProfileFromSessionCookie(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = (await cookieStore.get("session"))?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const userRecord = await adminDB
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (err) {
    const knownIssues: Record<
      "auth/invalid-session-cookie" |
        "auth/session-cookie-expired" |
        "auth/user-token-revoked",
      string
    > = {
      "auth/invalid-session-cookie": "Invalid session cookie! User may need to re-authenticate.",
      "auth/session-cookie-expired": "Session cookie has expired! User needs to log in again.",
      "auth/user-token-revoked": "User's token has been revoked! Forcing re-authentication.",
    };

    if (err instanceof FirebaseError) {
      const message = knownIssues[err.code as keyof typeof knownIssues] || err.message;
      console.warn(message);
      return null;
    }

    if (err instanceof Error && err.name === "FirestoreError") {
      console.error("Firestore Error when fetching user:", err.message);
      return null;
    }

    const errorMessage =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred while fetching the current user!";

    console.error("Unexpected error in getCurrentUser:", errorMessage);
    return null;
  }
}

export async function isUserAuthenticated() {
  const userProfile = await getUserProfileFromSessionCookie();
  return Boolean(userProfile);
}

export async function signOutAction(params: { userId: string }) {
  const { userId } = params;

  if (!userId) {
    return {
      success: false,
      message: "No user ID provided!",
    };
  }

  try {
    const currentUserFeedbackSnapshot = await adminDB
      .collection("feedback")
      .where("userId", "==", userId)
      .get();
    const feedbackDeletionPromises = currentUserFeedbackSnapshot.docs.map(
      async (feedbackDoc) => {
        await adminDB.collection("feedback").doc(feedbackDoc.id).delete();
      }
    );

    const currentUserInterviewsSnapshot = await adminDB
      .collection("interviews")
      .where("userId", "==", userId)
      .get();
    const interviewsDeletionPromises = currentUserInterviewsSnapshot.docs.map(
      async (interviewDoc) => {
        await adminDB.collection("interviews").doc(interviewDoc.id).delete();
      }
    );

    const userDeletionPromise = adminDB
      .collection("users")
      .doc(userId)
      .delete();

    await Promise.all([
      ...feedbackDeletionPromises,
      ...interviewsDeletionPromises,
      userDeletionPromise,
    ]);

    const cookieStore = await cookies();
    await cookieStore.delete("session");

    return {
      success: true,
      message: "Account and all associated data successfully deleted!",
    };
  } catch (err) {
    if (err instanceof FirebaseError) {
      console.error("Firebase Error during sign-out:", err);

      return {
        success: false,
        message: err.message || "An error occurred while signing out!",
      };
    }

    const errMsg =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred while signing out!";

    console.error("Sign-out Action Error:", errMsg);

    return {
      success: false,
      message: errMsg,
    };
  }
}
