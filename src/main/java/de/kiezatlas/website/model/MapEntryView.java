package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * 
 * @author Malte Reißig <malte@mikromedia.de>
 */
public class MapEntryView implements JSONEnabled {
    
    Topic geoObject = null;
    Topic geoCoordTopic = null;
    GeoCoordinate geoCoordinate = null;
    Topic bezirk = null;
    Topic bezirksregion = null;
    List<Topic> thema = null;   
    
    Logger log = Logger.getLogger(MapEntryView.class.getName());
    
     public MapEntryView(Topic geoObject, GeomapsService geomaps) {
        this.geoObject = geoObject;
        // fetch geo-coordinate via address
        Topic addressTopic = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent", "dm4.core.child", "dm4.contacts.address");
        if (addressTopic != null) {
            this.geoCoordTopic = addressTopic.getRelatedTopic("dm4.core.composition", "dm4.core.parent", "dm4.core.child", "dm4.geomaps.geo_coordinate");
            if (geoCoordTopic != null) {
                this.geoCoordinate = geomaps.geoCoordinate(geoCoordTopic);      
            } else {
                log.log(Level.WARNING, "**** KiezatlasEntry''s Address ({0}) has no Geo Coordinate set!", addressTopic.getSimpleValue());
            }
        } else {
            log.log(Level.WARNING, "**** KiezatlasEntry ({0}, {1}) has no Address set!", 
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        // fetch citymap-webalias (in uris)
        this.bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
        this.bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirksregion"); // ### many?
        if (bezirksregion == null) {
            log.log(Level.WARNING, "*** KiezatlasEntry ({0}, {1}, \"{2}\") has no Bezirksregion topic set!", 
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue(), bezirk.getSimpleValue()});
        }
    }

    public MapEntryView(Topic geoObject, Topic geoCoordTopic, GeoCoordinate geoCoordinate) {
        this.geoObject = geoObject;
        this.geoCoordTopic = geoCoordTopic;
        this.geoCoordinate = geoCoordinate;
        // fetch citymap-webalias (in uris)
        this.bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
        this.bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirksregion"); // ### many?
        if (bezirksregion == null) {
            log.log(Level.WARNING, "*** KiezatlasEntry ({0}, {1}, \"{2}\") has no Bezirksregion topic set!", 
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue(), bezirk.getSimpleValue()});
        }
    }

    public JSONObject toJSON() {
        try {
            JSONObject object = new JSONObject();
            if (geoCoordTopic == null) {
                log.log(Level.WARNING, "KiezatlasEntry has no geo-coordinate topic, null-ing this object during serialization");
            } else {
                object.put("uri", geoObject.getUri())
                    .put("id", geoObject.getId())
                    .put("name", geoObject.getSimpleValue().toString())
                    .put("geo_coordinate_lat", geoCoordinate.lat)
                    .put("geo_coordinate_lon", geoCoordinate.lon)
                    .put("geo_coordinate_id", geoCoordTopic.getId());
                if (bezirk != null) {
                    object.put("bezirk_uri", bezirk.getUri());
                    object.put("bezirk_name", bezirk.getSimpleValue());   
                }
                if (bezirksregion != null) {
                    object.put("bezirksregion_uri", bezirksregion.getUri());
                    object.put("bezirksregion_name", bezirksregion.getSimpleValue());   
                }   
            }
            return object;
        } catch (JSONException ex) {
            log.log(Level.SEVERE, null, ex);
        }
        return null;
    }

}
