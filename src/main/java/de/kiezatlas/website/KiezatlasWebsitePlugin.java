package de.kiezatlas.website;

import java.util.logging.Logger;
import java.util.List;
import java.util.ArrayList;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.core.MediaType;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import de.deepamehta.plugins.geospatial.service.GeospatialService;
import de.kiezatlas.service.KiezatlasService;
import de.kiezatlas.website.model.EntryView;
import de.kiezatlas.website.model.MapEntryView;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.logging.Level;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;

/**
 * @author Malte Reißig (<malte@mikromedia.de>)
 * @website http://github.com/mukil/dm4-kiezatlas-website
 * @version 0.2-SNAPSHOT - compatible with DeepaMehta 4.4
 */
@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class KiezatlasWebsitePlugin extends PluginActivator {

	private Logger log = Logger.getLogger(getClass().getName());

	@Inject KiezatlasService kiezService;

	@Inject GeospatialService spatialService;

	@Inject GeomapsService geomapsService;

	@GET
	@Produces(MediaType.TEXT_HTML)
	public InputStream getKiezatlasWebsite() {
		return getStaticResource("web/index.html");
	}

	@GET
	@Path("/kiezatlas/topic/{topicId}")
	public EntryView getKiezatlasTopicView(@HeaderParam("Referer") String referer,
	    @PathParam("topicId") long topicId) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		return new EntryView(dms.getTopic(topicId), geomapsService);
	}

	@GET
	@Path("/kiezatlas/search/{coordinatePair}/{radius}")
	public List<MapEntryView> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates,
	    @PathParam("radius") String radius) {
		double lon = 13.4, lat = 52.5;
		if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
			lon = Double.parseDouble(coordinates.split(",")[0].trim());
			lat = Double.parseDouble(coordinates.split(",")[1].trim());
		}
		double r;
		r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
		List<Topic> geoCoordTopics = spatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
		ArrayList<MapEntryView> results = new ArrayList<MapEntryView>();
		for (Topic geoCoordTopic : geoCoordTopics) {
			// GeoCoordinate geoCoord = geomapsService.geoCoordinate(geoCoordTopic);
			Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child",
			    "dm4.core.parent", "dm4.contacts.address");
			if (address != null) {
				ResultList<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition",
				    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
				for (RelatedTopic geoObject : geoObjects) {
					results.add(new MapEntryView(geoObject, geomapsService));
				}
			} else {
				log.info("No Address Entry found for geocoordinate " + geoCoordTopic.getSimpleValue());
			}
		}
		return results;
	}

	@GET
	@Path("/kiezatlas/search")
	@Transactional
	public List<MapEntryView> searchTopics(@HeaderParam("Referer") String referer,
	    @QueryParam("search") String query) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		try {
			log.info("> query=\"" + query + "\"");
			ArrayList<MapEntryView> results = new ArrayList<MapEntryView>();
			if (query.isEmpty()) {
				log.warning("No search term entered, returning empty resultset");
				return results;
			}
			List<Topic> singleTopics = dms.searchTopics(query, null);
			log.info(singleTopics.size() + " topics found");
			for (Topic topic : singleTopics) {
				if (topic.getTypeUri().equals("ka2.geo_object.name")) {
					Topic geoObject = topic.getRelatedTopic("dm4.core.composition",
					    "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
					results.add(new MapEntryView(geoObject, geomapsService));
				} else {
					log.info("### NO-MATCH: Found " + topic.getTypeUri() + " data-entry");
				}
			}
			return results;
		} catch (Exception e) {
			throw new RuntimeException("Searching topics failed", e);
		}
	}

	// --- Kiezatlas City Resources

	@GET
	@Path("/kiezatlas/bezirk")
	public ResultList<RelatedTopic> getKiezatlasDistricts() {
		return dms.getTopics("ka2.bezirk", 0);
	}

	@GET
	@Path("/kiezatlas/bezirk/{topicId}")
	public List<MapEntryView> getKiezatlasMapEntriesByDistrict(@HeaderParam("Referer") String referer,
	    @PathParam("topicId") long bezirkId) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		ArrayList<MapEntryView> results = new ArrayList<MapEntryView>();
		Topic bezirk = dms.getTopic(bezirkId);
		ResultList<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
		    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
		for (RelatedTopic geoObject : geoObjects) {
			results.add(new MapEntryView(geoObject, geomapsService));
		}
		return results;
	}

	@GET
	@Path("/kiezatlas/bezirksregion")
	public ResultList<RelatedTopic> getKiezatlasSubregions() {
		return dms.getTopics("ka2.bezirksregion", 0);
	}

	@GET
	@Path("/kiezatlas/bezirksregion/{topicId}")
	public List<MapEntryView> getKiezatlasMapEntriesBySubdistrict(@HeaderParam("Referer") String referer,
	    @PathParam("topicId") long bezirksregionId) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		ArrayList<MapEntryView> results = new ArrayList<MapEntryView>();
		Topic bezirksregion = dms.getTopic(bezirksregionId);
		ResultList<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
		    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
		for (RelatedTopic geoObject : geoObjects) {
			results.add(new MapEntryView(geoObject, geomapsService));
		}
		return results;
	}

	// --- Geo Coding Utiltiy Resources

	@GET
	@Path("/kiezatlas/geocode/{input}")
	public String geoCodeAddressInput(@HeaderParam("Referer") String referer,
	    @PathParam("input") String input) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		String query = input;
		String result = "";
		query = query.substring(2, query.length() - 1);
		try {
			// Encoded url to open
			query = URLEncoder.encode(query, "UTF-8");
			String url = "http://maps.googleapis.com/maps/api/geocode/json?address="
			    + query + "&sensor=false&locale=de";
			URLConnection connection = new URL(url).openConnection();
			connection.setRequestProperty("Content-Type", "application/json");
			connection.setRequestProperty("Charset", "UTF-8");
			// Get the response
			BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(),
			    "UTF-8"));
			StringBuilder sb = new StringBuilder();
			String line;
			while ((line = rd.readLine()) != null) {
				sb.append(line);
			}
			rd.close();
			result = sb.toString();
		} catch (UnsupportedEncodingException ex) {
			log.log(Level.WARNING, "Unsuporrted Encoding Exception", ex);
		} catch (MalformedURLException mux) {
			log.log(Level.WARNING, "Malformed URL Exception", mux);
		} catch (IOException ioex) {
			log.log(Level.WARNING, "IOException", ioex);
		}
		return result;
	}

	@GET
	@Path("/kiezatlas/reverse-geocode/{latlng}")
	public String geoCodeLocationInput(@HeaderParam("Referer") String referer,
	    @PathParam("latlng") String latlng) {
		if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
		String result = "";
		try {
			log.info("Start geo coding location (" + latlng + ") ...");
			String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="
			    + latlng + "&language=de";
			// &result_type=street_address|postal_code&key=API_KEY
			URLConnection connection = new URL(url).openConnection();
			connection.setRequestProperty("Content-Type", "application/json");
			connection.setRequestProperty("Charset", "UTF-8");
			// Get the response
			BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(),
			    "UTF-8"));
			StringBuilder sb = new StringBuilder();
			String line;
			while ((line = rd.readLine()) != null) {
				sb.append(line);
			}
			rd.close();
			result = sb.toString();
			log.info("Geo Coded Locatino successfully.");
		} catch (UnsupportedEncodingException ex) {
			log.log(Level.WARNING, "Unsuporrted Encoding Exception", ex);
		} catch (MalformedURLException mux) {
			log.log(Level.WARNING, "Malformed URL Exception", mux);
		} catch (IOException ioex) {
			log.log(Level.WARNING, "IOException", ioex);
		}
		return result;
	}

	// --- Private Utility Methods

	private boolean isValidReferer (String ref) {
		if (ref == null) return false;
		if (ref.contains(".kiezatlas.de/") ||  ref.contains("http://localhost/")) {
			return true;
		} else {
			return false;
		}
	}

}
