"use server";

import { adminDB } from "@/firebase/admin";

// Get interviews created by the current user
export async function fetchInterviewsByUserId(
 email: string,
  limit = 20
): Promise<Interview[]> {
  if (!email) {
    console.warn("Attempted to fetch latest interviews with undefined email");
    return [];
  }

  try {
    const snapshot = await adminDB
      .collection("interviews")
      .where("finalized", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limit * 2) // fetch extra in case some belong to current user
      .get();

    if (snapshot.empty) {
      console.log(`No latest interviews found (excluding user email ${email})`);
      return [];
    }

    // Filter out interviews created by current user email
    const interviews = snapshot.docs
      .map((doc) => ({ interviewId: doc.id, ...doc.data() }) as Interview)
      .filter((interview) => interview.userEmail !== email)
      .slice(0, limit);

    return interviews;
  } catch (err) {
    console.error(
      `Error fetching latest interviews (excluding user email ${email}):`,
      err
    );
    return [];
  }
}

// Get latest interviews created by other users
export async function fetchLatestInterviews(
  params: FetchLatestInterviewsParams
): Promise<Interview[]> {
  const { userId, limit = 20 } = params; // Here, userId is again the current user's ID

  if (!userId) {
    console.warn("Attempted to fetch latest interviews with undefined user ID");

    return [];
  }

  try {
    const snapshot = await adminDB
      .collection("interviews")
      .orderBy("createdAt", "desc")
      .where("userId", "!=", userId)
      .where("finalized", "==", true)
      .limit(limit)
      .get();

    if (snapshot.empty) {
      console.log(`No latest interviews found (excluding user ${userId})`);

      return [];
    }

    // Return latest interviews created by other users
    return snapshot.docs.map((doc) => ({
      interviewId: doc.id,
      ...doc.data(),
    })) as Interview[];
  } catch (err) {
    console.error(
      `Error fetching latest interviews (excluding user ${userId}):`,
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
    const interview = await adminDB.collection("interviews").doc(id).get();

    return interview?.data() as Interview | null;
  } catch (err) {
    console.error(`Error fetching interview ${id}:`, err);

    return null;
  }
}


