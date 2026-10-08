import "server-only";
import { notFound } from "next/navigation";
import { api, type UserCard } from "./cards-api";
import { db, type CardRow } from "./db";

/**
 * Loads a card only if the provider lists it under this user's UID, so a user
 * can never act on someone else's userBankcardId.
 */
export async function ownedCard(uid: string, userBankcardId: string | number): Promise<UserCard> {
  const cards = await api.userCards(uid);
  const card = (cards ?? []).find((c) => String(c.userBankcardId) === String(userBankcardId));
  if (!card) notFound();
  return card;
}

export function localCard(userBankcardId: string | number): CardRow | undefined {
  return db().prepare("SELECT * FROM cards WHERE user_bankcard_id = ?").get(String(userBankcardId)) as
    | CardRow
    | undefined;
}
