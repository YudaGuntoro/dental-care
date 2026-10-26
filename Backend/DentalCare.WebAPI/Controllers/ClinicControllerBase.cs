using DentalCare.Persistence.Repositories;

namespace DentalCare.WebAPI.Controllers;

public abstract class ClinicControllerBase(IUnitOfWork unitOfWork) : ApiControllerBase
{
    protected IRepository<TEntity> Repository<TEntity>() where TEntity : class => unitOfWork.Repository<TEntity>();
    protected IQueryable<TEntity> Query<TEntity>() where TEntity : class => Repository<TEntity>().Query();
    protected Task<int> SaveChangesAsync() => unitOfWork.SaveChangesAsync();
}
