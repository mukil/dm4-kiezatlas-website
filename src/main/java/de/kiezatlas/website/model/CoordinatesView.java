package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.geomaps.model.GeoCoordinate;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

public class CoordinatesView implements JSONEnabled {

    private final Logger log = Logger.getLogger(getClass().getName());
    
    JSONObject item = new JSONObject();

    public void setName(String title) {
        try {
            item.put("name", title);
        } catch (JSONException ex) {
            throw new RuntimeException("StreetCoordinates could not be constructed", ex);
        }
    }

    public void setCoordinates(GeoCoordinate coordinates) {
        try {
            item.put("latitude", coordinates.lat);
            item.put("longitude", coordinates.lon);
        } catch (JSONException ex) {
            throw new RuntimeException("StreetCoordinates could not be constructed", ex);
        }
    }

    public JSONObject toJSON() {
        return item;
    }

}
