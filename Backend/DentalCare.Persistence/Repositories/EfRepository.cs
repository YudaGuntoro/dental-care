using DentalCare.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.Persistence.Repositories;

public sealed class EfRepository<TEntity>(DentalCareDbContext db) : IRepository<TEntity> where TEntity : class
{
    private readonly DbSet<TEntity> _set = db.Set<TEntity>();

    public IQueryable<TEntity> Query() => _set;
    public ValueTask<TEntity?> FindAsync(params object?[] keyValues) => _set.FindAsync(keyValues);
    public void Add(TEntity entity) => _set.Add(entity);
    public void AddRange(IEnumerable<TEntity> entities) => _set.AddRange(entities);
    public void Remove(TEntity entity) => _set.Remove(entity);
    public void RemoveRange(IEnumerable<TEntity> entities) => _set.RemoveRange(entities);
}
