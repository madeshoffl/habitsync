import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, orderBy, Timestamp } from "firebase/firestore";

/**
 * Add a note to a habit completion
 */
export async function addHabitNote(
  userId: string,
  habitId: string,
  habitName: string,
  note: string,
  date?: Date
): Promise<void> {
  try {
    const noteDate = date || new Date();
    await addDoc(collection(db, "habitNotes"), {
      userId,
      habitId,
      habitName,
      note,
      createdAt: Timestamp.fromDate(noteDate),
      date: noteDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error("Error adding habit note:", error);
  }
}

/**
 * Get all notes for a specific habit
 */
export async function getHabitNotes(
  userId: string,
  habitId?: string,
  limitCount: number = 50
): Promise<Array<{ id: string; habitId: string; habitName: string; note: string; createdAt: Date; date: string }>> {
  try {
    let notesQuery;
    
    if (habitId) {
      notesQuery = query(
        collection(db, "habitNotes"),
        where("userId", "==", userId),
        where("habitId", "==", habitId),
        orderBy("createdAt", "desc")
      );
    } else {
      notesQuery = query(
        collection(db, "habitNotes"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
    }
    
    const snapshot = await getDocs(notesQuery);
    const notes = snapshot.docs.slice(0, limitCount).map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        habitId: data.habitId,
        habitName: data.habitName || "Unknown Habit",
        note: data.note,
        createdAt: data.createdAt.toDate(),
        date: data.date || data.createdAt.toDate().toISOString().split('T')[0],
      };
    });
    
    return notes;
  } catch (error) {
    console.error("Error getting habit notes:", error);
    return [];
  }
}

/**
 * Get notes grouped by date
 */
export async function getNotesByDate(userId: string): Promise<Array<{ date: string; notes: Array<{ habitName: string; note: string; time: string }> }>> {
  try {
    const notes = await getHabitNotes(userId);
    const grouped: { [key: string]: Array<{ habitName: string; note: string; time: string }> } = {};
    
    notes.forEach((note) => {
      if (!grouped[note.date]) {
        grouped[note.date] = [];
      }
      
      grouped[note.date].push({
        habitName: note.habitName,
        note: note.note,
        time: note.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      });
    });
    
    // Convert to array and sort by date (newest first)
    return Object.entries(grouped)
      .map(([date, notes]) => ({ date, notes }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("Error getting notes by date:", error);
    return [];
  }
}

