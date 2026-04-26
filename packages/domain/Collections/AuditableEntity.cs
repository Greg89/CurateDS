namespace CurateDS.Domain.Collections;

/// <summary>
/// Base class for every auditable aggregate root.
/// CreatedUtc / CreatedBy are set once during construction and never change.
/// UpdatedUtc / UpdatedBy are maintained by derived entity mutation methods via SetUpdated().
/// DeletedUtc / DeletedBy are set when the entity is soft-deleted via SoftDelete().
/// </summary>
public abstract class AuditableEntity
{
    // Parameterless constructor for EF Core materialization.
    protected AuditableEntity() { }

    public DateTime CreatedUtc { get; private set; }

    public string CreatedBy { get; private set; } = string.Empty;

    public DateTime UpdatedUtc { get; private set; }

    public string UpdatedBy { get; private set; } = string.Empty;

    public DateTime? DeletedUtc { get; private set; }

    public string? DeletedBy { get; private set; }

    public bool IsDeleted => DeletedUtc.HasValue;

    /// <summary>
    /// Call once from each derived entity's private parameterized constructor.
    /// Sets CreatedUtc / CreatedBy and initialises UpdatedUtc / UpdatedBy to the same values.
    /// </summary>
    protected void SetAuditOnCreate(DateTime createdUtc, string createdBy)
    {
        CreatedUtc = createdUtc;
        CreatedBy = createdBy;
        UpdatedUtc = createdUtc;
        UpdatedBy = createdBy;
    }

    /// <summary>
    /// Call from derived entity mutation methods to stamp the update.
    /// </summary>
    protected void SetUpdated(DateTime updatedUtc, string updatedBy)
    {
        UpdatedUtc = updatedUtc;
        UpdatedBy = updatedBy;
    }

    /// <summary>
    /// Soft-deletes the entity by recording the deletion timestamp and actor.
    /// </summary>
    public void SoftDelete(DateTime deletedUtc, string deletedBy)
    {
        DeletedUtc = deletedUtc;
        DeletedBy = deletedBy;
        UpdatedUtc = deletedUtc;
        UpdatedBy = deletedBy;
    }
}
