package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

public class NewsFeedItem implements JSONEnabled {

    private final Logger log = Logger.getLogger(getClass().getName());
    
    JSONObject item = new JSONObject();

    public void setTitle(String title) {
        try {
            item.put("title", title);
        } catch (JSONException ex) {
            throw new RuntimeException("NewsFeedItem could not be constructed", ex);
        }
    }

    public void setDescription(String description) {
        try {
            item.put("description", description);
        } catch (JSONException ex) {
            throw new RuntimeException("NewsFeedItem could not be constructed", ex);
        }
    }

    public void setPublished(String dateString) {
        try {
            item.put("published", dateString);
            // Date newDate = DateFormat.getDateInstance(DateFormat.FULL, Locale.ENGLISH).parse(dateString);
            // item.put("published_de", DateFormat.getDateInstance(DateFormat.FULL, Locale.GERMANY).format(newDate));
        } catch (JSONException ex) {
            throw new RuntimeException("NewsFeedItem could not be constructed", ex);
        }
    }

    public void setLink(String href) {
        try {
            item.put("link", href);
        } catch (JSONException ex) {
            throw new RuntimeException("NewsFeedItem could not be constructed", ex);
        }
    }

    public JSONObject toJSON() {
        return item;
    }

}
