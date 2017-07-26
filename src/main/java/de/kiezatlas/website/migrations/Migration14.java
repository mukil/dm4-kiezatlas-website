package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.facets.FacetsService;
import de.deepamehta.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geospatial.GeospatialService;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.website.WebsiteService;
import static de.kiezatlas.website.WebsiteService.BEZIRKSREGION_NAME;
import static de.kiezatlas.website.WebsiteService.BEZIRKSREGION_NAME_FACET;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.logging.Logger;

/**
 *
 * @author malted
 */
public class Migration14 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WebsiteService website;
    @Inject private WorkspacesService workspaces;
    @Inject private KiezatlasService kiezatlas;
    @Inject private GeospatialService spatial;
    @Inject private FacetsService facets;

    @Override
    public void run() {
        // 1) Fetch all existing geo objects
        List<Topic> einrichtungen = dm4.getTopicsByType(KiezatlasService.GEO_OBJECT);
        // 2) Build up region name topics with id
        List<Topic> lorIds = dm4.getTopicsByType(WebsiteService.LOR_UTIL_ID);
        HashMap<String, Topic> lorIdMap = new HashMap<String, Topic>();
        for (Topic lorId : lorIds) {
            lorIdMap.put(lorId.getSimpleValue().toString(), lorId);
        }
        List<Topic> outerSpace = new ArrayList<Topic>();
        List<Topic> outerRegion = new ArrayList<Topic>();
        List<Topic> outerAddress = new ArrayList<Topic>();
        // 3) Create bezirksregion name facet assignment to all geo objects
        for (Topic geoObject : einrichtungen) {
            GeoCoordinate coordinates = kiezatlas.getGeoCoordinateByGeoObject(geoObject);
            if (coordinates != null) {
                String lorName = spatial.getGeometryFeatureNameByCoordinate(coordinates.lat + "," + coordinates.lon);
                if (lorName != null) {
                    String cleanedLorID = lorName.replace(WebsiteService.BEZIRKSREGION_SHAPEFILE_NAME_PREFIX, "");
                    Topic lorUtil = null;
                    if (lorIdMap.containsKey(cleanedLorID)) {
                        lorUtil = lorIdMap.get(cleanedLorID);
                        Topic utilParent = lorUtil.getRelatedTopic("dm4.core.composition", null, null, WebsiteService.LOR_UTIL);
                        Topic bezirksregion = utilParent.getChildTopics().getTopicOrNull(BEZIRKSREGION_NAME);
                        facets.updateFacet(geoObject, BEZIRKSREGION_NAME_FACET,
                            mf.newFacetValueModel(BEZIRKSREGION_NAME).putRef(bezirksregion.getId()));
                        log.info("ASSIGNED geo object \"" + geoObject.getSimpleValue() + "\" with Bezirksregion \"" + bezirksregion.getSimpleValue() + "\"");
                        // workspaces.assignToWorkspace(geoObject, website.getStandardWorkspace().getId());
                    } else {
                        log.warning("Could NOT assign geo object \"" + geoObject.getSimpleValue() + "\" as Bezirksregion Name is UNKNOWN \"" + cleanedLorID + "\"");
                        outerRegion.add(geoObject);
                    }
                } else {
                    log.warning("Could NOT find LOR of geo object \"" + geoObject.getSimpleValue() + "\" with GeoCoordinates \"" + coordinates + "\"");
                    outerSpace.add(geoObject);
                }
            } else {
                log.warning("Could NOT assign geo object \"" + geoObject.getSimpleValue() + "\" as it has NO GEO COORDINATE");
                outerAddress.add(geoObject);
            }
        }
        log.info("### Migration 14 COMPLETED: " + outerAddress.size() + " places without address, " + outerSpace.size() +
            " places with coordinates out of Berlin, " + outerRegion.size() + " places without a bezirksregion assignment");
    }

}
