import { SavedItemView } from "../types";
import { describeSavedView } from "../utils";

export function SavedViewsSection({
  disabled,
  savedViewName,
  savedViews,
  onApplySavedView,
  onDeleteSavedView,
  onSavedViewNameChange,
  onSaveView
}: Readonly<{
  disabled: boolean;
  savedViewName: string;
  savedViews: SavedItemView[];
  onApplySavedView: (view: SavedItemView) => void;
  onDeleteSavedView: (viewId: string) => void;
  onSavedViewNameChange: (name: string) => void;
  onSaveView: () => void;
}>) {
  return (
    <div className="saved-view-panel">
      <div className="panel-header">
        <h3>Saved Views</h3>
        <p>Keep favorite filter and sort combinations ready for later.</p>
      </div>

      <div className="saved-view-create">
        <label className="field">
          <span>View Name</span>
          <input
            value={savedViewName}
            onChange={(event) => onSavedViewNameChange(event.target.value)}
            disabled={disabled}
            placeholder="Wishlist on shelf"
            maxLength={60}
          />
        </label>

        <button
          className="secondary-button"
          disabled={disabled || savedViewName.trim().length === 0}
          onClick={onSaveView}
          type="button"
        >
          Save View
        </button>
      </div>

      {savedViews.length === 0 ? (
        <div className="empty-state compact">
          <p>No saved views yet.</p>
          <p>Save a filter set once and reuse it whenever this collection comes back up.</p>
        </div>
      ) : (
        <ul className="saved-view-list">
          {savedViews.map((view) => (
            <li className="saved-view-card" key={view.id}>
              <div>
                <h3>{view.name}</h3>
                <p>{describeSavedView(view.filters)}</p>
              </div>
              <div className="saved-view-actions">
                <button className="secondary-button" onClick={() => onApplySavedView(view)} type="button">
                  Apply
                </button>
                <button className="secondary-button" onClick={() => onDeleteSavedView(view.id)} type="button">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
