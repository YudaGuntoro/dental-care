using System.Collections.Concurrent;

namespace DentalCare.WebAPI.Controllers;

internal static class QueuePositionStore
{
    public static ConcurrentDictionary<string, int> CurrentPositions { get; } = new();

    public static string DateKey(DateTime from) => from.ToString("yyyy-MM-dd");

    public static void RemoveAppointment(int appointmentId)
    {
        foreach (var position in CurrentPositions.Where(x => x.Value == appointmentId).ToArray())
            CurrentPositions.TryRemove(position.Key, out _);
    }
}
