type SuccessResult<Value> = readonly [Value, undefined];
type ErrorResult = readonly [undefined, unknown];
type Result<Value> = SuccessResult<Value> | ErrorResult;

export async function tryCatch<Value>(promise: Promise<Value>): Promise<Result<Value>> {
  try {
    const data = await promise;
    return [data, undefined] as const;
  } catch (error) {
    return [undefined, error] as const;
  }
}
