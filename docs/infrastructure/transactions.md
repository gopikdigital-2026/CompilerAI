# Transaction Manager

## Unit of Work

`UnitOfWork<T>` collects operations and executes them sequentially:

```typescript
const uow = new UnitOfWork<{ execution: RuntimeExecution; approval: ApprovalRequest }>();
uow.add('execution', async () => repo.save(exec));
uow.add('approval', async () => approvalRepo.save(approval));
const results = await uow.execute();
```

## PostgresTransactionManager

Implements `ITransactionManager` with `begin()`, `commit()`, `rollback()`, and `execute<T>(work)`:

```typescript
const result = await tm.execute(async (ctx) => {
  // ctx.db is the IDatabaseClient within the transaction
  // ctx.txId is the transaction ID
  // ctx.isAborted tracks rollback state
  return await doWork(ctx);
});
```

In Supabase, transactions are implicit within RPC calls. The manager provides the abstraction for future explicit transaction support.

## Error Handling

If `work()` throws, the transaction is rolled back and a `TransactionError` is thrown. If the original error is already a `TransactionError`, it's re-thrown as-is.
