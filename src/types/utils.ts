export type RequireAtLeastOne<ObjectType> = {
  [Key in keyof ObjectType]-?: Required<Pick<ObjectType, Key>> & Partial<Pick<ObjectType, Exclude<keyof ObjectType, Key>>>;
}[keyof ObjectType];
