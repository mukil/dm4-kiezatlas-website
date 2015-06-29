package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * 
 * @author Malte Reißig <malte@mikromedia.de>
 */
public class KiezatlasEntry implements JSONEnabled {
    
    Topic geoObject = null;
    Topic geoCoordTopic = null;
    GeoCoordinate geoCoordinate = null;

    public KiezatlasEntry(Topic geoObject, Topic geoCoordTopic, GeoCoordinate geoCoordinate) {
        this.geoObject = geoObject;
        this.geoCoordTopic = geoCoordTopic;
        this.geoCoordinate = geoCoordinate;
    }

    public JSONObject toJSON() {
        try {
            return new JSONObject()
                    .put("name", geoObject.getSimpleValue().toString())
                    .put("geo_coordinate_lat", geoCoordinate.lat)
                    .put("geo_coordinate_lon", geoCoordinate.lon)
                    .put("geo_coordinate_id", geoCoordTopic.getId());
        } catch (JSONException ex) {
            Logger.getLogger(KiezatlasEntry.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }

}
