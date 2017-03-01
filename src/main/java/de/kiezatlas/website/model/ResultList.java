package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class ResultList implements JSONEnabled {

    JSONObject list;
    String status = "OK";

    public ResultList() {
        try {
            this.list = new JSONObject();
            JSONObject results = new JSONObject();
            JSONObject einrichtungen = new JSONObject();
                einrichtungen.put("name", "Einrichtungen");
                einrichtungen.put("results", new JSONArray());
            JSONObject angebote = new JSONObject();
                angebote.put("name", "Angebote");
                angebote.put("results", new JSONArray());
            results.put("cat1", einrichtungen);
            results.put("cat2", angebote);
            list.put("results", results);
            list.put("action", new JSONObject().put("url", "javascript:do_fulltext_search()").put("text", "im Volltextmodus suchen"));
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a ResultList failed", ex);
        }
    }

    public void putGeoObject(SearchResult result) throws JSONException {
        list.getJSONObject("results").getJSONObject("cat1")
            .getJSONArray("results").put(result.toJSON());
    }

    public void putAngebot(SearchResult result) throws JSONException {
        list.getJSONObject("results").getJSONObject("cat2")
            .getJSONArray("results").put(result.toJSON());
    }

    @Override
    public JSONObject toJSON() {
        try {
            list.put("status", this.status);
        } catch (JSONException ex) {
            Logger.getLogger(ResultList.class.getName()).log(Level.SEVERE, null, ex);
        }
        return list;
    }

}
