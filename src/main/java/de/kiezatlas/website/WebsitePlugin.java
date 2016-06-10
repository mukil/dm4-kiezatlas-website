package de.kiezatlas.website;

import com.sun.jersey.api.view.Viewable;
import de.deepamehta.core.Association;
import de.deepamehta.core.ChildTopics;
import de.deepamehta.core.DeepaMehtaObject;
import java.util.*;
import java.util.logging.Logger;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.Consumes;
import javax.ws.rs.core.MediaType;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.AssociationModel;
import de.deepamehta.core.model.ChildTopicsModel;
import de.deepamehta.core.model.SimpleValue;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.model.TopicRoleModel;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.Transactional;
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.facets.FacetsService;
import de.deepamehta.plugins.facets.model.FacetValue;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.plugins.webactivator.WebActivatorPlugin;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.angebote.model.AngebotsInfoAssigned;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;
import de.kiezatlas.website.model.BezirkInfo;
import de.kiezatlas.website.model.EinrichtungsInfo;
import de.kiezatlas.website.model.GeoObjectDetailsView;
import de.kiezatlas.website.model.GeoObjectView;
import de.mikromedia.webpages.WebpagePluginService;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.RoundingMode;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.text.DecimalFormat;
import java.util.logging.Level;
import java.util.HashMap;
import java.util.concurrent.Callable;
import javax.ws.rs.FormParam;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * The module bundling the Kiezatlas 2 Website.<br/>
 * Based on dm47-kiezatlas-2.1.7-SNAPSHOT, dm47-kiezatlas-etl-0.2.1-SNAPSHOT and dm47-webpages-0.3.<br/>
 * Compatible with DeepaMehta 4.7
 * <a href="http://github.com/mukil/dm4-kiezatlas-website">Source Code</a>
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * @version 0.3-SNAPSHOT
 */
@Path("/website")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class WebsitePlugin extends WebActivatorPlugin implements WebsiteService {

    private final Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;
    @Inject private AccessControlService acService;
    @Inject private WebpagePluginService pageService;
    @Inject private GeospatialService spatialService;
    @Inject private AngebotService angeboteService;
    @Inject private GeomapsService geomapsService;
    @Inject private FacetsService facetsService;
    @Inject KiezatlasService kiezatlas;

    // Application Cache of District Overview Resultsets
    HashMap<Long, List<GeoObjectView>> districtsCache = new HashMap<Long, List<GeoObjectView>>();
    HashMap<Long, Long> districtCachedAt = new HashMap<Long, Long>();

    // The URIs of KA2 Geo Object topics synchronized (and kept up-to-date in) Kiezatlas 1 have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    private static final String KA1_GEO_OBJECT_URI_PREFIX = "de.kiezatlas.topic.";

    /**
     * Sets the Kiezatlas Website index.html as main resource to be served at "/" by the webpages-module.
     */
    @Override
    public void init() {
        pageService.setFrontpageResource("/views/index.html", "de.kiezatlas.website");
        initTemplateEngine();
    }

    /**
     * Responds the frontpage of the Kiezatlas Website.
     * ### Unused: see init
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    public Viewable getWebsite() {
        return view("index");
    }

    /**
     * Responds with the administrative confirmation page of the Kiezatlas Website.
     */
    @GET
    @Path("/confirmation")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getConfirmationPage() {
        Topic confirmationWs = getPrivilegedWorkspace();
        ResultList<RelatedTopic> unconfirmedGeoObjects = confirmationWs.getRelatedTopics("dm4.core.aggregation", "dm4.core.child",
            "dm4.core.parent", KiezatlasService.GEO_OBJECT, 0);
        // ResultList<RelatedTopic> availableWebsites = dms.getTopics("ka2.website", 0);
        // viewData("websites", availableWebsites);
        List<RelatedTopic> sortedGeoObjects = unconfirmedGeoObjects.getItems();
        sortByModificationDateDescending(sortedGeoObjects);
        preparePageAuthorization();
        viewData("workspace", getStandardWorkspace());
        viewData("geoobjects", sortedGeoObjects);
        return view("confirmation");
    }

    /**
     * Builds up a form for introducing a NEW Kiezatlas Einrichtung (Geo Object).
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/create")
    public Viewable getGeoObjectEditPage() {
        if (!isAuthenticated()) return view("401");
        EinrichtungsInfo geoObject = new EinrichtungsInfo();
        geoObject.setCoordinates(new GeoCoordinate(13.4, 52.5));
        geoObject.setName("Neuer Eintrag");
        geoObject.setId(-1);
        viewData("geoobject", geoObject);
        prepareFormWithAvailableTopics();
        preparePageAuthorization();
        // misleading cause not in effect, createGeoObjectTopic() has the final saying here
        viewData("workspace", null);
        return view("edit");
    }

    /**
     * Processes the form for creating a Kiezatlas Einrichtung in a specific Workspace.
     */
    @POST
    @Produces(MediaType.TEXT_HTML)
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Path("/topic/save")
    @Transactional
    public Viewable createGeoObjectTopic(@FormParam("id") long topicId, @FormParam("name") String name, @FormParam("strasse") String strasse,
            @FormParam("plz") String plz, @FormParam("city") long city, @FormParam("district") long district,
            @FormParam("country") long country, @FormParam("beschreibung") String beschreibung,
            @FormParam("open") String oeffnungszeiten, @FormParam("ansprechpartner") String ansprechpartner,
            @FormParam("telefon") String telefon, @FormParam("email") String email, @FormParam("fax") String fax,
            @FormParam("website") String website, @FormParam("lat") double latitude, @FormParam("lon") double longitude,
            @FormParam("themen") List<Long> themen, @FormParam("angebote") List<Long> angebote, @FormParam("zielgruppen") List<Long> zielgruppen) {
        // 0) This method is secured through being a @POST
        Topic geoObject = null;
        Topic username = acService.getUsernameTopic(acService.getUsername());
        String districtName = "", coordinatePair = "", geoLocation = "";
        // Handle Geo Coordinates and District of Geo Object
        if (latitude == -1000 || longitude == -1000) {
            geoLocation = geoCodeAddressInput(URLEncoder.encode(strasse + ", " + plz + " " + city));
            coordinatePair = parseFirstCoordinatePair(geoLocation);
            districtName = parseFirstSublocality(geoLocation);
            log.info("> Reset Geo Coordinates by Street, Postal Code, City Value to \"" + coordinatePair + "\"");
        } else {
            // ### This leaves districtName = undefined
            log.info("> Geo Coordinates provided: " + latitude + ", " + longitude);
            coordinatePair = longitude + "," + latitude;
        }
        ChildTopicsModel addressValue = new ChildTopicsModel();
        setStreetTopicValue(addressValue, strasse);
        setPostalCodeValue(addressValue, plz);
        setCityTopicValue(addressValue, city);
        setCountryTopicValue(addressValue, country);;
        // 3) Assemble and create/update new Geo Object Topic basics
        ChildTopicsModel geoObjectTopicModel = new ChildTopicsModel()
            .put("ka2.geo_object.name", name)
            .put("dm4.contacts.address", addressValue);
        if (topicId == -1 || topicId == 0) {
            // ------------ Assign Geo Object Basics to the topic of getPrivilegedWorkspace() ------------------ //
            // UI Needs "dm4_no_geocoding=true" Cookie, otherwise it geo-codes automatically
            log.info("CREATE Einrichtung " + name + ", Straße: " + strasse + ", in \"" + plz + " " + city + "\"");
            geoObject = createUnconfirmedGeoObject(new TopicModel("ka2.geo_object", geoObjectTopicModel));
            createUserAssignment(geoObject, acService.getUsername());
            // ### Send Notification to EDITOR with basic infos on the "confirmation" process
            viewData("message", "Vielen Dank, Sie haben erfolgreich einen neuen Ort in den Kiezatlas eingetragen.");
            // ### Add hint about, that it will be confirmed soon.
        } else {
            // -------- Do not alter the topic workspace assignment, resp. use getStandardWorkspace() ---------- //
            geoObject = dms.getTopic(topicId);
            // Do Check if currently logged in user has user assignment AND topic is not managed by Kiezatlas 1
            if (isGeoObjectEditable(geoObject, username)) {
                log.info("UPDATE Einrichtung " + name + " (TopicID: " + topicId + ")");
                geoObject.setChildTopics(geoObjectTopicModel);
            } else {
                viewData("message", "Sie sind leider nicht berechtigt diesen Datensatz zu bearbeiten.");
            }
        }
        // 4) ### Assign ALL current, generic facet to Confirmation WS, too
        storeBeschreibungFacet(geoObject, beschreibung);
        storeBezirksFacet(geoObject, district);
        putRefFacets(geoObject, themen, THEMA_FACET, THEMA_CRIT);
        putRefFacets(geoObject, angebote, ANGEBOT_FACET, ANGEBOT_CRIT);
        putRefFacets(geoObject, zielgruppen, ZIELGRUPPE_FACET, ZIELGRUPPE_CRIT);
        // ------- From here on, ALL new topics are assigned to the topic behind getStandardWorkspace() --------- //
        // 5) Store Geo Coordinate
        storeGeoCoordinateFacet(geoObject.getChildTopics().getTopic("dm4.contacts.address"), coordinatePair);
        // 6) ### match Googles District Name to Site Topics via ETL
        // ### Bezirk Relation
        // 7) Set "Confirmed=false" flag // unpublished, to be confirmed
        // Defused setConfirmationFlag(geoObject, false);
        // 8) ### Handle Category-Relations
        // 9) ### Handle Image-File Upload (Seperately)
        // Prepare new form page (is unpublished..)
        return WebsitePlugin.this.getGeoObjectEditPage(geoObject.getId());
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/edit/{topicId}")
    public Viewable getGeoObjectEditPage(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        Topic geoObject = dms.getTopic(topicId);
        Topic username = acService.getUsernameTopic(acService.getUsername());
        if (!isAuthenticated()) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        if (isGeoObjectTopic(geoObject) || hasUserAssignment(geoObject, username)) {
            // Assemble Generic Einrichtungs Infos
            EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
            viewData("geoobject", einrichtung);
            viewData("themen", facetsService.getFacets(geoObject, THEMA_FACET).getItems());
            viewData("zielgruppen", facetsService.getFacets(geoObject, ZIELGRUPPE_FACET).getItems());
            // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET).getItems());
            // viewData("message", "Einrichtung \"" + geoObject.getSimpleValue() + "\" erfolgreich geladen.");
        } else {
            // ### throw 401
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
        }
        prepareFormWithAvailableTopics();
        viewData("workspace", getStandardWorkspace());
        // ### if (!isGeoObjectEditable(geoObject, username)) throw new WebApplicationException(Status.UNAUTHORIZED);
        viewData("editable", isGeoObjectEditable(geoObject, username));
        return view("edit");
    }

    /**
     * Builds up a form for editing a Kiezatlas Einrichtung.
     */
    @GET
    @Produces(MediaType.TEXT_HTML)
    @Path("/topic/confirm/{topicId}")
    @Transactional
    public Viewable doConfirmGeoObject(@PathParam("topicId") long topicId) {
        // ### Handle the case if user cannot edit anymore (just see) directly after confirmation.
        Topic geoObject = dms.getTopic(topicId);
        Topic username = acService.getUsernameTopic(acService.getUsername());
        if (!isConfirmationWorkspaceMember()) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        if (isGeoObjectTopic(geoObject) || hasUserAssignment(geoObject, username)) {
            Topic deepaMehtaWs = getStandardWorkspace();
            ChildTopics geoObjectChilds = geoObject.loadChildTopics().getChildTopics();
            Topic addressObject = geoObjectChilds.getTopic("dm4.contacts.address");
            ChildTopics addressChilds = addressObject.loadChildTopics().getChildTopics();
            Topic coordinateTopic = kiezatlas.getGeoCoordinateTopic(addressObject);
            ChildTopics coordinateChilds = coordinateTopic.getChildTopics();
            assignToWorkspace(geoObject, deepaMehtaWs.getId());
            assignToWorkspace(geoObjectChilds.getTopic("ka2.geo_object.name"), deepaMehtaWs.getId());
            assignToWorkspace(coordinateTopic, deepaMehtaWs.getId());
            assignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.longitude"), deepaMehtaWs.getId());
            assignToWorkspace(coordinateChilds.getTopic("dm4.geomaps.latitude"), deepaMehtaWs.getId());
            assignToWorkspace(addressObject, deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.street"), deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.postal_code"), deepaMehtaWs.getId());
            assignToWorkspace(addressChilds.getTopic("dm4.contacts.city"), deepaMehtaWs.getId());
            if (addressChilds.has("dm4.contacts.country")) {
                assignToWorkspace(addressChilds.getTopic("dm4.contacts.country"), deepaMehtaWs.getId());
            }
            log.info("Assigned Geo Object to Standard Workspace \"" + deepaMehtaWs.getSimpleValue() + "\"");
            viewData("message", "Der Eintrag \"" + geoObject.getSimpleValue() + "\" erfolgreich freigeschaltet.");
        } else {
            viewData("message", "Eine Einrichtung mit dieser ID ist uns nicht bekannt.");
        }
        return getGeoObjectDetailsPage(geoObject.getId());
    }

    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") long topicId) {
        Topic geoObject = dms.getTopic(topicId);
        Topic username = getUsernameTopic();
        if (!isGeoObjectTopic(geoObject)) {
            return view("404");
        }
        // Assemble Generic Einrichtungs Infos
        EinrichtungsInfo einrichtung = assembleGeneralEinrichtungsInfo(geoObject);
        // ### Yet Missing: Träger, Bezirksregion, Bezirk, Administrator Infos und Stichworte
        viewData("geoobject", einrichtung);
        // Assemble Category Assignments for Einrichtung;
        viewData("zielgruppen", facetsService.getFacets(geoObject, ZIELGRUPPE_FACET));
        viewData("themen", facetsService.getFacets(geoObject, THEMA_FACET));
        // viewData("angebote", facetsService.getFacets(geoObject, ANGEBOT_FACET));
        // Assemble Angebosinfos for Einrichtung
        List<AngebotsInfoAssigned> angebotsInfos = angeboteService.getAngebotsInfosAssigned(geoObject);
        if (angebotsInfos.size() > 0) viewData("angebotsinfos", angebotsInfos);
        preparePageAuthorization();
        viewData("editable", isGeoObjectEditable(geoObject, username));
        return view("detail");
    }

    /**
     * Renders details about a Kiezatlas Geo Object into HTML.
     *
     * @param topicId
     * @return
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.TEXT_HTML)
    public Viewable getGeoObjectDetailsPage(@PathParam("topicId") String topicId) {
        Topic geoObject = null;
        if (topicId.startsWith("t-")) {
            geoObject = dms.getTopic("uri", new SimpleValue("de.kiezatlas.topic." + topicId));
        } else {
            geoObject = dms.getTopic(Long.parseLong(topicId));
        }
        return (geoObject != null) ? getGeoObjectDetailsPage(geoObject.getId()) : view("404");
    }

    /**
     * Fetches details about a Kiezatlas Geo Object.
     *
     * ### Revise DTO.
     *
     * @param referer
     * @param topicId
     * @return A GeoObject DetailsView as DTO to presend details about a place.
     */
    @GET
    @Path("/topic/{topicId}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeoObjectDetailsView getGeoObjectDetails(@HeaderParam("Referer") String referer,
            @PathParam("topicId") long topicId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        Topic geoObject = dms.getTopic(topicId);
        GeoObjectDetailsView geoDetailsView = null;
        if (isGeoObjectTopic(geoObject)) {
            geoDetailsView = new GeoObjectDetailsView(dms.getTopic(topicId), geomapsService, angeboteService);
        }
        return geoDetailsView;
    }

    /**
     * Fetches Geo Objects to be displayed in a map by WGS 84 coordinate pair (Longitude, Latitude)
     * and a numerical radius (provide in km).
     * @param coordinates
     * @param radius
     */
    @GET
    @Path("/search/{coordinatePair}/{radius}")
    public List<GeoObjectView> getGeoObjectsNearBy(@PathParam("coordinatePair") String coordinates,
            @PathParam("radius") String radius) {
        // .) ### Authenticate...
        // 0) Set default coordinates for a query
        double lon = 13.4, lat = 52.5;
        if (coordinates != null && !coordinates.isEmpty() && coordinates.contains(",")) {
            lon = Double.parseDouble(coordinates.split(",")[0].trim());
            lat = Double.parseDouble(coordinates.split(",")[1].trim());
        }
        // 1) Set default search radius for a query
        double r = (radius.isEmpty() || radius.equals("0")) ? 1.0 : Double.parseDouble(radius);
        List<Topic> geoCoordTopics = spatialService.getTopicsWithinDistance(new GeoCoordinate(lon, lat), r);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        // 2) Process spatial search results (=topics of type Geo Coordinate)
        for (Topic geoCoordTopic : geoCoordTopics) {
            // 2.1) Check for an Address topic
            Topic address = geoCoordTopic.getRelatedTopic("dm4.core.composition", "dm4.core.child",
                "dm4.core.parent", "dm4.contacts.address");
            if (address != null) {
                // 2.1.1) If place has an address set, create a DTO for map display
                ResultList<RelatedTopic> geoObjects = address.getRelatedTopics("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
                for (RelatedTopic geoObject : geoObjects) {
                    if (isGeoObjectTopic(geoObject)) {
                        results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                    }
                }
            } else {
                // 2.1.2) If place has NO address set, skip place for map display
                log.log(Level.INFO, "No Address Entry found for geo coordinate {0}", geoCoordTopic.getSimpleValue());
            }
        }
        return results;
    }

    /**
     * Fetches a list of Geo Objects to be displayed in a map by name.
     * Ditch searchGeoObjectNames in KiezatlasPlugin (used by Famportal-Angular service).
     * @param referer
     * @param query
     */
    @GET
    @Path("/search/by_name")
    public List<GeoObjectView> searchGeoObjectsByName(@HeaderParam("Referer") String referer,
            @QueryParam("query") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            log.log(Level.INFO, "> nameQuery=\"{0}\"", query);
            String queryValue = query.trim();
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (queryValue.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> singleTopics = dms.searchTopics(queryValue, "ka2.geo_object.name");
            log.log(Level.INFO, "{0} name topics found", singleTopics.size());
            for (Topic topic : singleTopics) {
                Topic geoObject = topic.getRelatedTopic("dm4.core.composition",
                    "dm4.core.child", "dm4.core.parent", "ka2.geo_object");
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics by name failed", e);
        }
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by text query.
     * @param referer
     * @param query
     */
    @GET
    @Path("/search")
    public List<GeoObjectView> searchGeoObjectsFulltext(@HeaderParam("Referer") String referer,
            @QueryParam("search") String query) {
        // .) ### Authenticate
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // TODO: Maybe it is also desirable that we wrap the users query into quotation marks
        // (to allow users to search for a combination of words)
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            // 1) Fetch unique geo object topics by text query string
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // 2) Process saerch results and create DTS for map display
            log.info("Start building response for " + geoObjects.size() + " OVERALL");
            for (Topic topic : geoObjects) {
                if (isGeoObjectTopic(topic)) {
                    results.add(new GeoObjectView(topic, geomapsService, angeboteService));
                }
            }
            log.info("Build up response " + results.size() + " geo objects across all districts");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    /**
     * Builds up a list of search results (Geo Objects to be displayed in a map) by district
     * topic id and text query.
     * @param referer
     * @param districtId
     * @param query
     */
    @GET
    @Path("/search/{districtId}")
    @Transactional
    public List<GeoObjectView> searchGeoObjectsFulltextInDistrict(@HeaderParam("Referer") String referer,
            @PathParam("districtId") long districtId, @QueryParam("search") String query) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        try {
            ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
            if (query.isEmpty()) {
                log.warning("No search term entered, returning empty resultset");
                return results;
            }
            List<Topic> geoObjects = searchFulltextInGeoObjectChilds(query);
            // iterate over merged results
            log.info("Start building response for " + geoObjects.size() + " and FILTER by DISTRICT");
            for (Topic geoObject: geoObjects) {
                // check for district
                if (hasRelatedBezirk(geoObject, districtId)) {
                    if (isGeoObjectTopic(geoObject)) {
                        results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
                    }
                }
            }
            log.info("Build up response " + results.size() + " geo objects in district=\""+districtId+"\"");
            return results;
        } catch (Exception e) {
            throw new RuntimeException("Searching geo object topics failed", e);
        }
    }

    /**
     * Fires searchTopic()-calls to find Geo Object topics by their:
     * <ul>
     *  <li>Geo Object Name</li>
     *  <li>Beschreibung Facet</li>
     *  <li>Stichworte Facet</li>
     *  <li>Bezirksregion Facet</li>
     * </ul>
     * @param query
     * @return A list of unique topics of type "ka2.geo_object".
     */
    @Override
    public List<Topic> searchFulltextInGeoObjectChilds(String query) {
        // ### Authenticate
        // ### Todo: Fetch for ka2.ansprechpartner, traeger name, too
        HashMap<Long, Topic> uniqueResults = new HashMap<Long, Topic>();
        List<Topic> searchResults = dms.searchTopics(query, "ka2.geo_object.name");
        List<Topic> descrResults = dms.searchTopics(query, "ka2.beschreibung");
        List<Topic> stichworteResults = dms.searchTopics(query, "ka2.stichworte");
        // List<Topic> sonstigesResults = dms.searchTopics(query, "ka2.sonstiges");
        List<Topic> bezirksregionResults = dms.searchTopics(query, "ka2.bezirksregion"); // many
        // List<Topic> traegerNameResults = dms.searchTopics(query, "ka2.traeger.name");
        // List<Topic> traegerNameResults = dms.searchTopics(query, "dm4.contacts.street");
        log.info("> " + searchResults.size() + ", "+ descrResults.size() +", "+stichworteResults.size() + ", " + bezirksregionResults.size()
                + " results in four child types for query=\""+query+"\" in FULLTEXT");
        // merge all three types in search results
        searchResults.addAll(descrResults);
        searchResults.addAll(stichworteResults);
        // searchResults.addAll(sonstigesResults);
        searchResults.addAll(bezirksregionResults);
        // searchResults.addAll(traegerNameResults);
        // make search results only contain unique geo object topics
        log.info("Building up unique search resultset of fulltext search...");
        Iterator<Topic> iterator = searchResults.iterator();
        while (iterator.hasNext()) {
            Topic next = iterator.next();
            // ### may be "null" (check for Facets? relatio) of search child types
            Topic geoObject = null;
            if (next.getTypeUri().equals("ka2.bezirksregion")) {
                geoObject = getFirstParentGeoObjectTopic(next);
            } else if (next.getTypeUri().equals("ka2.geo_object.name") || next.getTypeUri().equals("ka2.stichworte")
                || next.getTypeUri().equals("ka2.beschreibung")) {
                geoObject = getParentGeoObjectTopic(next);
            }
            if (geoObject != null && !uniqueResults.containsKey(geoObject.getId())) {
                uniqueResults.put(geoObject.getId(), geoObject);
            }
        }
        log.info("searchResultLength=" + (searchResults.size()) + ", " + "uniqueResultLength=" + uniqueResults.size());
        return new ArrayList(uniqueResults.values());
    }

    // --- Bezirk Specific Resource Search, Overall, Listing

    @GET
    @Path("/bezirk")
    public List<BezirkInfo> getKiezatlasDistricts() {
        ArrayList<BezirkInfo> results = new ArrayList<BezirkInfo>();
        for (RelatedTopic bezirk : dms.getTopics("ka2.bezirk", 0)) {
            results.add(new BezirkInfo(bezirk));
        }
        return results;
    }

    /**
     * We cache subsequent requests to this method, which means that on the district pages it will take 6 hours until
     * a new index will be generated (and newly added geo objects will appear on the map).
     *
     * Details of existing (but updated) geo objects are not affected by this cache.
     * @param referer
     * @param bezirkId
     */
    @GET
    @Path("/bezirk/{topicId}")
    public List<GeoObjectView> getGeoObjectsByDistrict(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirkId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        // use cache
        if (districtsCache.containsKey(bezirkId)) {
            // caching lifetime is 30 000 or 12 000 ms for testing purposes
            if (districtCachedAt.get(bezirkId) > new Date().getTime() - 21600000) { // 21600000 for approx. 6hr in ms
                log.info("Returning cached list of geo object for district " + bezirkId);
                return districtsCache.get(bezirkId);
            }
            // invalidate cache
            districtsCache.remove(bezirkId);
            districtCachedAt.remove(bezirkId);
        }
        // populate new resultset
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirk = dms.getTopic(bezirkId);
        ResultList<RelatedTopic> geoObjects = bezirk.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
        }
        log.info("Populating cached list of geo object for district " + bezirkId);
        // insert new result into cache
        districtsCache.put(bezirkId, results);
        districtCachedAt.put(bezirkId, new Date().getTime());
        return results;
    }

    // --- Bezirksregionen Resources Listing

    @GET
    @Path("/bezirksregion")
    public ResultList<RelatedTopic> getKiezatlasSubregions() {
        return dms.getTopics("ka2.bezirksregion", 0);
    }

    @GET
    @Path("/bezirksregion/{topicId}")
    public List<GeoObjectView> getGeoObjectsBySubregions(@HeaderParam("Referer") String referer, @PathParam("topicId") long bezirksregionId) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        ArrayList<GeoObjectView> results = new ArrayList<GeoObjectView>();
        Topic bezirksregion = dms.getTopic(bezirksregionId);
        ResultList<RelatedTopic> geoObjects = bezirksregion.getRelatedTopics("dm4.core.aggregation",
            "dm4.core.child", "dm4.core.parent", "ka2.geo_object", 0);
        for (RelatedTopic geoObject : geoObjects) {
            if (isGeoObjectTopic(geoObject)) {
                results.add(new GeoObjectView(geoObject, geomapsService, angeboteService));
            }
        }
        return results;
    }

    @GET
    @Path("/geocode")
    public String geoCodeAddressInput(@HeaderParam("Referer") String referer, @QueryParam("query") String input) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeAddressInput(input);
    }

    @GET
    @Path("/reverse-geocode/{latlng}")
    public String geoCodeLocationInput(@HeaderParam("Referer") String referer, @PathParam("latlng") String latlng) {
        if (!isValidReferer(referer)) throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        return geoCodeLocationInput(latlng);
    }

    // --- Utility Resources (Geo Coding and Reverse Geo Coding)

    private String geoCodeAddressInput(String addressValue) {
        String query = addressValue;
        String result = "";
        try {
            // Encoded url to open
            log.info("Requested geo code query=\"" + query + "\" - Processing");
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
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    /**
     * Returns name for the given coordinate pair by (unauthenticated) asking Google Geocode API.
     * @param inputValue    String containing an URL encoded latitude longitude value pair.
     * @return
     */
    private String geoCodeLocationInput(String inputValue) {
        String result = "";
        try {
            String url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + inputValue + "&language=de";
            // &result_type=street_address|postal_code&key=API_KEY
            URLConnection connection = new URL(url).openConnection();
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Charset", "UTF-8");
            // Get the response
            BufferedReader rd = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = rd.readLine()) != null) {
                sb.append(line);
            }
            rd.close();
            result = sb.toString();
            log.info("Reverse Geo Coded Location ("+inputValue+") successfully.");
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
        return result;
    }

    // ------------------------------------------------------------------------------------------------- Private Methods

    private void assignToWorkspace(DeepaMehtaObject object, long workspaceId) {
        if (object != null) {
            workspaceService.assignToWorkspace(object, workspaceId);
        }
    }

    private boolean isConfirmationWorkspaceMember() {
        String username = acService.getUsername();
        if (username != null) {
            // ### this yet misses a check if user is OWNER of WS (so we must make "admin" an explicit member
            return acService.isMember(username, getPrivilegedWorkspace().getId());
        } else {
            return false;
        }
    }

    private boolean isAuthenticated() {
        return (acService.getUsername() != null);
    }

    /** Stores "Confirmed" topic on Geo Object into our "Confirmation" workspace.
    private void setConfirmationFlag(final Topic geoObject, final boolean value) {
        try {
            dms.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
                    geoObject.getChildTopics().set(CONFIRMED_TYPE, value);
                    dms.getAccessControl().assignToWorkspace(geoObject.getChildTopics().getTopic(CONFIRMED_TYPE),
                        workspaceService.getWorkspace(CONFIRMATION_WS_URI).getId());
                    log.info("Assigned Geo Object: " + geoObject.getSimpleValue() + " to custom Workspace, confirmed=" + value);
                    return geoObject;
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("Setting Geo Object Confirmation Flag failed", e);
        }
    } **/

    private void setCityTopicValue(ChildTopicsModel model, long value) {
        model.putRef("dm4.contacts.city", value);
    }

    private void setStreetTopicValue(ChildTopicsModel model, String value) {
        if (value.isEmpty()) return;
        List<Topic> streetNames = dms.searchTopics(value.trim(), "dm4.contacts.street");
        for (Topic streetName : streetNames) {
            if (streetName.getSimpleValue().toString().equals(value.trim())) {
                model.putRef("dm4.contacts.street", streetName.getId());
                return;
            }
        }
        log.info("Creating new Street Topic for value \"" + value.trim() + "\"");
        model.put("dm4.contacts.street", value.trim());
    }

    private void setPostalCodeValue(ChildTopicsModel model, String value) {
        if (value.isEmpty()) value = POSTAL_CODE_DUMMY_VALUE;
        List<Topic> postalCodes = dms.searchTopics(value.trim(), "dm4.contacts.postal_code");
        for (Topic postalCode : postalCodes) {
            if (postalCode.getSimpleValue().toString().equals(value.trim())) {
                model.putRef("dm4.contacts.postal_code", postalCode.getId());
                return;
            }
        }
        log.info("Creating new Postal Code Topic for value \"" + value.trim() + "\"");
        model.put("dm4.contacts.postal_code", value.trim());
    }

    private void setCountryTopicValue(ChildTopicsModel model, long value) {
        model.putRef("dm4.contacts.country", value);
    }

    /** see duplicate in GeomapsPlugin.storeGeoCoordinate() */
    private void storeGeoCoordinateFacet(Topic address, String coordinatePair) {
        // ### Just write new coordinates IF values changed.
        double longitude, latitude;
        longitude = Double.parseDouble(coordinatePair.split(",")[0]);
        latitude = Double.parseDouble(coordinatePair.split(",")[1]);
        log.info("Storing geo coordinate (" + latitude +","+ longitude + ") for addressTopic=" + address.getId());
        FacetValue value = new FacetValue("dm4.geomaps.geo_coordinate").put(new ChildTopicsModel()
            .put("dm4.geomaps.longitude", longitude)
            .put("dm4.geomaps.latitude",  latitude)
        );
        facetsService.updateFacet(address, "dm4.geomaps.geo_coordinate_facet", value);
    }

    private void storeBeschreibungFacet(Topic geoObject, String beschreibung) {
        if (!beschreibung.trim().isEmpty()) {
            facetsService.updateFacet(geoObject.getId(), WebsiteService.BESCHREIBUNG_FACET,
                new FacetValue(WebsiteService.BESCHREIBUNG).put(beschreibung.trim()));
        }
    }

    private void storeBezirksFacet(Topic geoObject, long bezirksTopicId) {
        if (bezirksTopicId > -1) {
            facetsService.updateFacet(geoObject.getId(), WebsiteService.BEZIRK_FACET,
                new FacetValue(WebsiteService.BEZIRK).putRef(bezirksTopicId));
        }
    }

    private void putRefFacets(Topic geoObject, List<Long> ids, String facetTypeUri, String childTypeUri) {
        for (Long id : ids){
            facetsService.updateFacet(geoObject.getId(), facetTypeUri,
                new FacetValue(childTypeUri).addRef(id));
        }
    }

    private Topic createUnconfirmedGeoObject(final TopicModel geoObjectModel) {
        try {
            return dms.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Topic>() {
                @Override
                public Topic call() {
                    Topic geoObject = dms.createTopic(geoObjectModel);
                    Topic addressObject = geoObject.getChildTopics().getTopic("dm4.contacts.address");
                    long workspaceId = getPrivilegedWorkspace().getId();
                    dms.getAccessControl().assignToWorkspace(geoObject, getPrivilegedWorkspace().getId());
                    dms.getAccessControl().assignToWorkspace(addressObject, getPrivilegedWorkspace().getId());
                    dms.getAccessControl().assignToWorkspace(addressObject.getChildTopics().getTopic("dm4.contacts.street"), workspaceId);
                    dms.getAccessControl().assignToWorkspace(addressObject.getChildTopics().getTopic("dm4.contacts.city"), workspaceId);
                    dms.getAccessControl().assignToWorkspace(addressObject.getChildTopics().getTopic("dm4.contacts.postal_code"), workspaceId);
                    dms.getAccessControl().assignToWorkspace(addressObject.getChildTopics().getTopic("dm4.contacts.country"), workspaceId);
                    log.info("Created Unconfirmed Geo Object ("+geoObject.getSimpleValue()+") in Confirmation WS");
                    return geoObject;
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
        }
    }

    private Association createUserAssignment(final Topic geoObject, final String username) {
        final Topic usernameTopic = acService.getUsernameTopic(username);
        if (!hasUserAssignment(geoObject, usernameTopic)) {
            try {
                return dms.getAccessControl().runWithoutWorkspaceAssignment(new Callable<Association>() {
                    @Override
                    public Association call() {
                        // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
                        Association assignment = dms.createAssociation(new AssociationModel("de.kiezatlas.user_assignment",
                            new TopicRoleModel(geoObject.getId(), "dm4.core.default"),
                            new TopicRoleModel(usernameTopic.getId(), "dm4.core.default")));
                        dms.getAccessControl().assignToWorkspace(assignment, getPrivilegedWorkspace().getId());
                        log.info("Created User Assignment ("+username+") for Geo Object \"" + geoObject.getSimpleValue() + "\" in Confirmation WS");
                        // ## Workspace Asignment for flag and association yet MISSING
                        return assignment;
                    }
                });
            } catch (Exception e) {
                throw new RuntimeException("Creating User Assignment to Geo Object FAILED", e);
            }
        }
        return null;
    }

    private boolean hasUserAssignment(Topic topic, Topic username) {
        if (username == null) return false;
        ResultList<RelatedTopic> assignments = topic.getRelatedTopics("de.kiezatlas.user_assignment",
            "dm4.core.default", "dm4.core.default", null, 0);
        for (RelatedTopic assignedUsername : assignments) {
            if (assignedUsername.getSimpleValue().equals(username.getSimpleValue())) return true;
        }
        return false;
    }

    private Topic getParentGeoObjectTopic(Topic entry) {
        Topic result = entry.getRelatedTopic(null, "dm4.core.child", "dm4.core.parent", KiezatlasService.GEO_OBJECT);
        if (result == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has no Geo Object as PARENT"); // fulltext searches also "abandoned" facet topics
        return result;
    }

    private Topic getFirstParentGeoObjectTopic(Topic entry) {
        ResultList<RelatedTopic> results = entry.getRelatedTopics("dm4.core.aggregation", "dm4.core.child",
            "dm4.core.parent", KiezatlasService.GEO_OBJECT, 0);
        if (results == null) log.warning("Search Result Entry: " +entry.getTypeUri()
            + ", " +entry.getId() +" has NOT ONE Geo Object as PARENT");  // fulltext-search incl. "abandoned" facets
        return (results.getSize() > 0 ) ? results.get(0) : null;
    }

    private Topic getRelatedBezirk(Topic geoObject) {
        return geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", "ka2.bezirk");
    }

    private boolean hasRelatedBezirk(Topic geoObject, long bezirksId) {
        Topic relatedBezirk = getRelatedBezirk(geoObject);
        if (relatedBezirk == null) return false;
        if (relatedBezirk.getId() == bezirksId) return true;
        return false;
    }

    private boolean isGeoObjectTopic(Topic geoObject) {
        // ### Checking for typeuri AND Confirmed flagmay be redundant
        return geoObject != null && geoObject.getTypeUri().equals(KiezatlasService.GEO_OBJECT);
            // && geoObject.getChildTopics().getBoolean(CONFIRMED_TYPE);
    }

    private boolean isGeoObjectEditable(Topic geoObject, Topic username) {
        return hasUserAssignment(geoObject, username) && isKiezatlas2GeoObject(geoObject);
    }

    private boolean isKiezatlas2GeoObject(Topic geoObject) {
        return !(geoObject.getUri().startsWith(KA1_GEO_OBJECT_URI_PREFIX));
    }

    private boolean isValidReferer(String ref) {
        if (ref == null) return false;
        if (ref.contains(".kiezatlas.de/") || ref.contains("localhost")) {
            return true;
        } else {
            return false;
        }
    }

    private EinrichtungsInfo assembleGeneralEinrichtungsInfo(Topic einrichtung) {
        EinrichtungsInfo infoModel = new EinrichtungsInfo();
        try {
            einrichtung.loadChildTopics();
            infoModel.setName(einrichtung.getChildTopics().getString(KiezatlasService.GEO_OBJECT_NAME));
            // Sets Street, Postal Code, City and Address
            Topic addressTopic = einrichtung.getChildTopics().getTopic(KiezatlasService.GEO_OBJECT_ADDRESS);
            infoModel.setAddress(addressTopic);
            // Sets Latitude and Longitude
            GeoCoordinate geoCoordinate = geomapsService.getGeoCoordinate(addressTopic);
            infoModel.setCoordinates(geoCoordinate);
            // Sets Kontakt Facet
            Topic kontakt = facetsService.getFacet(einrichtung, KONTAKT_FACET);
            if (kontakt != null) {
                kontakt.loadChildTopics();
                infoModel.setEmail(kontakt.getChildTopics().getString(KONTAKT_MAIL));
                infoModel.setFax(kontakt.getChildTopics().getString(KONTAKT_FAX));
                infoModel.setTelefon(kontakt.getChildTopics().getString(KONTAKT_TEL));
                infoModel.setAnsprechpartner(kontakt.getChildTopics().getString(KONTAKT_ANSPRECHPARTNER));
            }
            // Calculates Imprint Value
            Topic bezirk = getRelatedBezirk(einrichtung);
            if (bezirk == null) {
                log.warning("No BEZIRK assigned to Geo Object!");
                log.warning("EinrichtungsInfos Bezirk has NO IMPRINT value set, ID:" + einrichtung.getId());
                infoModel.setImprintUrl("http://pax.spinnenwerk.de/~kiezatlas/index.php?id=6");
            } else {
                infoModel.setBezirk(bezirk.getSimpleValue().toString());
                infoModel.setBezirkId(bezirk.getId());
                BezirkInfo bezirkInfo = new BezirkInfo(bezirk);
                if (bezirkInfo.getImprintLink() != null) {
                    infoModel.setImprintUrl(bezirkInfo.getImprintLink().getSimpleValue().toString());
                }
            }
            // Image Path
            Topic imagePath = kiezatlas.getImageFileFacetByGeoObject(einrichtung);
            if (imagePath != null) infoModel.setImageUrl(imagePath.getSimpleValue().toString());
            // Öffnungszeiten Facet
            Topic offnung = facetsService.getFacet(einrichtung, OEFFNUNGSZEITEN_FACET);
            if (offnung != null) infoModel.setOeffnungszeiten(offnung.getSimpleValue().toString());
            // Beschreibung Facet
            Topic beschreibung = facetsService.getFacet(einrichtung, BESCHREIBUNG_FACET);
            if (beschreibung != null) infoModel.setBeschreibung(beschreibung.getSimpleValue().toString());
            // Stichworte Facet
            Topic stichworte = facetsService.getFacet(einrichtung, STICHWORTE_FACET);
            if (stichworte != null) infoModel.setStichworte(stichworte.getSimpleValue().toString());
            // LOR Nummer Facet
            Topic lor = facetsService.getFacet(einrichtung, LOR_FACET);
            if (lor != null) infoModel.setLORId(lor.getSimpleValue().toString());
            // Website Facet
            Topic website = facetsService.getFacet(einrichtung, WEBSITE_FACET);
            if (website != null) infoModel.setWebpage(website.getSimpleValue().toString());
            infoModel.setId(einrichtung.getId());
        } catch (Exception ex) {
            throw new RuntimeException("Could not assemble EinrichtungsInfo", ex);
        }
        return infoModel;
    }

    private String parseFirstCoordinatePair(String jsonGoogleLocation) {
        String result = "";
        try {
            JSONObject response = new JSONObject(jsonGoogleLocation);
            JSONArray results = response.getJSONArray("results");
            // JSONObject geometry = results.();
            for (int i=0; i < results.length(); i++) {
                JSONObject obj = results.getJSONObject(i);
                // log.info("> Result: " + obj.toString());
                JSONObject geometry = obj.getJSONObject("geometry");
                JSONObject location = geometry.getJSONObject("location");
                log.info("Location: " + location.toString() + " Type: " + geometry.getString("location_type"));
                DecimalFormat df = new DecimalFormat("#.000");
                df.setRoundingMode(RoundingMode.HALF_DOWN);
                return df.format(location.getDouble("lng")) + "," + df.format(location.getDouble("lat"));
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return result;
    }

    private String parseFirstSublocality(String jsonGoogleLocation) {
        String result = "";
        try {
            JSONObject response = new JSONObject(jsonGoogleLocation);
            JSONArray results = response.getJSONArray("results");
            for (int i=0; i < results.length(); i++) {
                JSONObject obj = results.getJSONObject(i);
                JSONArray components = obj.getJSONArray("address_components");
                for (int k=0; k < components.length(); k++) {
                    JSONObject component = components.getJSONObject(k);
                    log.info("> Address Component: " + component.toString());
                    JSONArray types = component.getJSONArray("types");
                    for (int t=0; t < types.length(); t++) {
                        log.info("> Component Type: " + types.getString(i));
                        if (types.getString(i).equals("sublocality_level1")) {
                            if (component.has("long_name") && !component.getString("long_name").equals("undefined")) {
                                return component.getString("long_name");
                            } else {
                                return component.getString("short_name");
                            }
                        }
                    }
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(WebsitePlugin.class.getName()).log(Level.SEVERE, null, ex);
        }
        return result;
    }

    private Topic getStandardWorkspace() {
        return workspaceService.getWorkspace(workspaceService.DEEPAMEHTA_WORKSPACE_URI);
    }

    private Topic getPrivilegedWorkspace() {
        return workspaceService.getWorkspace(CONFIRMATION_WS_URI);
    }

    private Topic getUsernameTopic() {
        String username = acService.getUsername();
        if (username != null && !username.isEmpty()) {
            return acService.getUsernameTopic(username);
        } else {
            return null;
        }
    }

    private List<RelatedTopic> getAngebotCriteriaTopics() {
        return sortAlphabeticalDescending(dms.getTopics("ka2.criteria.angebot", 0).getItems());
    }

    private List<RelatedTopic> getThemaCriteriaTopics() {
        return sortAlphabeticalDescending(dms.getTopics("ka2.criteria.thema", 0).getItems());
    }

    private List<RelatedTopic> getZielgruppeCriteriaTopics() {
        return sortAlphabeticalDescending(dms.getTopics("ka2.criteria.zielgruppe", 0).getItems());
    }

    private List<Topic> getAvailableCountryTopics() {
        List<Topic> countries = new ArrayList<Topic>();
        for (RelatedTopic city : dms.getTopics("dm4.contacts.country", 0)) {
            if (!city.getUri().isEmpty()) countries.add(city);
        }
        return countries;
    }

    private List<Topic> getAvailableCityTopics() {
        List<Topic> cities = new ArrayList<Topic>();
        for (RelatedTopic city : dms.getTopics("dm4.contacts.city", 0)) {
            if (!city.getUri().isEmpty()) cities.add(city);
        }
        return cities;
    }

    private List<RelatedTopic> getAvailableDistrictTopics() {
        ResultList<RelatedTopic> topics = dms.getTopics("ka2.bezirk", 0);
        List<RelatedTopic> results = topics.getItems();
        sortAlphabeticalDescending(results);
        return results;
    }

    private List<RelatedTopic> sortAlphabeticalDescending(List<RelatedTopic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                String one = t1.getSimpleValue().toString();
                String two = t2.getSimpleValue().toString();
                return one.compareTo(two);
            }
        });
        return topics;
    }

    private void sortAlphabeticalDescendingByChildTopic(List<RelatedTopic> topics, final String childTypeUri) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                t1.loadChildTopics(childTypeUri);
                t2.loadChildTopics(childTypeUri);
                String one = t1.getChildTopics().getString(childTypeUri);
                String two = t2.getChildTopics().getString(childTypeUri);
                return one.compareTo(two);
            }
        });
    }

    private void sortByModificationDateDescending(List<RelatedTopic> topics) {
        Collections.sort(topics, new Comparator<Topic>() {
            public int compare(Topic t1, Topic t2) {
                long one = (Long) t1.getProperty("dm4.time.modified");
                long two = (Long) t2.getProperty("dm4.time.modified");
                if (one > two) return -1;
                if (two > one) return 1;
                return 0;
            }
        });
    }

    private void prepareFormWithAvailableTopics() {
        viewData("availableCities", getAvailableCityTopics());
        viewData("availableDistricts", getAvailableDistrictTopics());
        viewData("availableCountries", getAvailableCountryTopics());
        viewData("availableThemen", getThemaCriteriaTopics());
        // viewData("availableAngebote", getAngebotCriteriaTopics());
        viewData("availableZielgruppen", getZielgruppeCriteriaTopics());
        log.info("> Prepare Form Template with available Topics");
    }

    private void preparePageAuthorization() {
        boolean isAuthenticated = isAuthenticated();
        boolean isPrivileged = isConfirmationWorkspaceMember();
        viewData("authenticated", isAuthenticated);
        viewData("is_publisher", isPrivileged);
        log.info("> Prepare Page Auth (isPrivileged=" + isPrivileged + ", isAuthenticated=" + isAuthenticated() + ")");
    }

}
