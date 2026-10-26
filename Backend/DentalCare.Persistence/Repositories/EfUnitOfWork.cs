using DentalCare.Persistence.Context;

namespace DentalCare.Persistence.Repositories;

public sealed class EfUnitOfWork(DentalCareDbContext db) : IUnitOfWork
{
    private readonly Dictionary<Type, object> _repositories = new();

    public IRepository<TEntity> Repository<TEntity>() where TEntity : class
    {
        if (!_repositories.TryGetValue(typeof(TEntity), out var repository))
        {
            repository = new EfRepository<TEntity>(db);
            _repositories[typeof(TEntity)] = repository;
        }

        return (IRepository<TEntity>)repository;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => db.SaveChangesAsync(cancellationToken);
}
