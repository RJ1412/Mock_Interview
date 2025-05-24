"use server";

import { adminDB } from "@/firebase/admin";

// Get interviews created by the current user (by email now)
export async function fetchInterviewsByUserId(
  userEmail: string | undefined
): Promise<Interview[]> {
  if (!userEmail) {
    console.warn("Attempted to fetch user interviews with undefined email!");
    return [];
  }

  try {
    const snapshot = await adminDB
      .collection("interviews")
      .where("userEmail", "==", userEmail) // using email now
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      console.log(`No interviews found for user ${userEmail}`);
      return [];
    }

    return snapshot.docs.map((doc) => ({
      interviewId: doc.id,
      ...(doc.data() as Omit<Interview, "interviewId">),
    }));
  } catch (err) {
    console.error(`Error fetching interviews for user ${userEmail}:`, err);
    return [];
  }
}

// Get latest interviews created by other users (excluding current user's email)
export async function fetchLatestInterviews(
  params: FetchLatestInterviewsParams
): Promise<Interview[]> {
  const { userEmail, limit = 20 } = params;

  if (!userEmail) {
    console.warn("Attempted to fetch latest interviews with undefined user email");
    return [];
  }

  try {
    const snapshot = await adminDB
      .collection("interviews")
      .where("finalized", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limit * 2) // over-fetch to allow client-side filtering
      .get();

    if (snapshot.empty) {
      console.log(`No latest interviews found (excluding user ${userEmail})`);
      return [];
    }

    const interviews = snapshot.docs
      .map((doc) => ({
        interviewId: doc.id,
        ...(doc.data() as Omit<Interview, "interviewId">),
      }))
      .filter((interview) => interview.userEmail !== userEmail)
      .slice(0, limit);

    return interviews;
  } catch (err) {
    console.error(
      `Error fetching latest interviews (excluding user ${userEmail}):`,
      err
    );
    return [];
  }
}

// Fetch interview details given an interview ID
export async function fetchInterviewDetailsById(
  id: string
): Promise<Interview | null> {
  if (!id) {
    console.warn("Attempted to fetch interview with undefined ID!");
    return null;
  }

  try {
    const doc = await adminDB.collection("interviews").doc(id).get();

    if (!doc.exists) {
      console.log(`Interview with ID ${id} not found.`);
      return null;
    }

    return {
      interviewId: doc.id,
      ...(doc.data() as Omit<Interview, "interviewId">),
    };
  } catch (err) {
    console.error(`Error fetching interview ${id}:`, err);
    return null;
  }
}
