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
    GeoCoordinate geoCoordinate = null;
    Topic bezirk = null;
    Topic bezirksregion = null;
    List<Topic> thema = null;   
    Topic addressTopic = null;
    
    Logger log = Logger.getLogger(MapEntryView.class.getName());
    
     public MapEntryView(Topic geoObject, GeomapsService geomaps) {
        this.geoObject = geoObject;
        // fetch geo-coordinate via address
        addressTopic = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent", "dm4.core.child", "dm4.contacts.address");
        if (addressTopic != null) {
            Topic geoCoordTopic = addressTopic.getRelatedTopic("dm4.core.composition", "dm4.core.parent", "dm4.core.child", "dm4.geomaps.geo_coordinate");
            if (geoCoordTopic != null) {
                this.geoCoordinate = geomaps.geoCoordinate(geoCoordTopic);
                addressTopic.loadChildTopics();
            } else {
                log.log(Level.WARNING, "**** KiezatlasEntry''s Address ({0}) has no Geo Coordinate set!", addressTopic.getSimpleValue());
            }
        } else {
            log.log(Level.WARNING, "**** KiezatlasEntry ({0}, {1}) has no Address set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        // fetch citymap-webalias (in uris)
        this.bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
        if (bezirk == null) {
            log.log(Level.WARNING, "*** KiezatlasEntry ({0}, {1}) has no Bezirks topic set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        this.bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirksregion"); // ### many?
        if (bezirksregion == null) {
            log.log(Level.WARNING, "*** KiezatlasEntry ({0}, {1}) has no Bezirksregion topic set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
    }

    public JSONObject toJSON() {
        try {
            JSONObject object = new JSONObject();
            if (geoCoordinate == null) {
                log.log(Level.WARNING, "KiezatlasEntry has no geo-coordinate, NULL-ifying this object during serialization");
            } else {
                long aggregated_address_id = addressTopic.getChildTopics().getTopic("dm4.contacts.street").getId() +
                        addressTopic.getChildTopics().getTopic("dm4.contacts.postal_code").getId();
                object.put("uri", geoObject.getUri())
                    .put("id", geoObject.getId())
                    .put("name", geoObject.getSimpleValue().toString())
                    .put("address_id", aggregated_address_id)
                    .put("geo_coordinate_lat", geoCoordinate.lat)
                    .put("geo_coordinate_lon", geoCoordinate.lon);
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
