package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author Malte Reißig <malte@mikromedia.de>
 */
public class EntryView implements JSONEnabled {

	Topic geoObject = null;
	Topic geoCoordTopic = null;
	GeoCoordinate geoCoordinate = null;
	Topic bezirk = null;
	Topic bezirksregion = null;
	//
	ResultList<RelatedTopic> relatedTopics = null;
	ResultList<RelatedTopic> relatedAudiences = null;
	ResultList<RelatedTopic> relatedServices = null;
	// sonstiges
	Topic beschreibung = null;
	Topic contact = null;
	Topic opening_hours = null;
	Topic lor_nr = null;

	Logger log = Logger.getLogger(EntryView.class.getName());

	public EntryView(Topic geoObject, GeomapsService geomaps) {
		this.geoObject = geoObject;
		// fetch geo-coordinate via address
		Topic addressTopic = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
		    "dm4.core.child", "dm4.contacts.address");
		if (addressTopic != null) {
			this.geoCoordTopic = addressTopic.getRelatedTopic("dm4.core.composition",
			    "dm4.core.parent", "dm4.core.child", "dm4.geomaps.geo_coordinate");
			if (geoCoordTopic != null) {
				this.geoCoordinate = geomaps.geoCoordinate(geoCoordTopic);
			} else {
				log.log(Level.WARNING, "**** KiezatlasEntry''s Address ({0}) has no "
				    + "Geo Coordinate set!", addressTopic.getSimpleValue());
			}
		} else {
			log.log(Level.WARNING, "**** KiezatlasEntry ({0}, {1}) has no Address set!",
			    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
		}
		// fetch citymap-webalias (in uris)
		this.bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
		    "dm4.core.child", "ka2.bezirk");
		this.bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
		    "dm4.core.child", "ka2.bezirksregion"); // ### many?
		if (bezirksregion == null) {
			log.log(Level.WARNING, "*** KiezatlasEntry ({0}, {1}, \"{2}\") has no Bezirksregion set!",
			    new Object[]{geoObject.getUri(), geoObject.getSimpleValue(), bezirk.getSimpleValue()});
		}
		relatedTopics = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
		    "dm4.core.child", "ka2.criteria.thema", 0);
		relatedAudiences = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
		    "dm4.core.child", "ka2.criteria.zielgruppe", 0);
		relatedServices = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
		    "dm4.core.child", "ka2.criteria.angebot", 0);
		// fetch other details
		this.beschreibung = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
		    "dm4.core.child", "ka2.beschreibung");
		this.contact = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
		    "dm4.core.child", "ka2.kontakt");
		this.opening_hours = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
		    "dm4.core.child", "ka2.oeffnungszeiten");
		this.lor_nr = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
		    "dm4.core.child", "ka2.lor_nummer");
	}

	public JSONObject toJSON() {
		try {
			JSONObject object = new JSONObject();
			if (geoCoordTopic == null) {
				log.log(Level.WARNING, "KiezatlasEntry has no geo-coordinate topic, null-ing"
				    + "this object during serialization");
			} else {
				object.put("uri", geoObject.getUri())
				    .put("id", geoObject.getId())
				    .put("name", geoObject.getSimpleValue().toString())
				    .put("address_name", geoObject.getChildTopics()
					.getTopic("dm4.contacts.address").getSimpleValue())
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
				if (relatedTopics.getSize() > 0) {
					JSONArray related = new JSONArray();
					for (RelatedTopic relatedTopic : relatedTopics) {
						related.put(new JSONObject()
						    .put("related_topic_uri", relatedTopic.getUri())
						    .put("related_topic_name",
							relatedTopic.getSimpleValue().toString()));
					}
					object.put("related_topics", related);
				}
				if (beschreibung != null) {
					object.put("beschreibung", beschreibung.getSimpleValue());
				}
				if (contact != null) {
					contact.loadChildTopics();
					// just telefon und fax
					object.put("kontakt", contact.getModel().toJSON());
				}
				if (opening_hours != null) {
					object.put("oeffnungszeiten", opening_hours.getSimpleValue());
				}
				if (lor_nr != null) {
					object.put("lor_id", lor_nr.getSimpleValue());
				}
			}
			return object;
		} catch (JSONException ex) {
			log.log(Level.SEVERE, null, ex);
		}
		return null;
	}

}
