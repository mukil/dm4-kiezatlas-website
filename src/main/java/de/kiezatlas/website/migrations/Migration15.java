package de.kiezatlas.website.migrations;

import de.deepamehta.core.Association;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.facets.FacetsService;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.KiezatlasService;
import de.kiezatlas.website.WebsiteService;
import java.util.List;
import java.util.logging.Logger;

/**
 *
 * @author malted
 */
public class Migration15 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";

    @Inject private WorkspacesService workspaces;
    @Inject private FacetsService facets;

    @Override
    public void run() {
        log.info("### Migration 15 STARTED: Assign all Bezirksregionen Name and Einrichtungs Associations to a proper workspace");
        // Fetch all existing bezirksregionen
        Topic kiezatlasWs = workspaces.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        List<Topic> bezirksregionNamen = dm4.getTopicsByType(WebsiteService.BEZIRKSREGION_NAME);
        // Create bezirksregion name facet assignment to all geo objects
        for (Topic bezirksregion : bezirksregionNamen) {
            List<RelatedTopic> einrichtungen = bezirksregion.getRelatedTopics("dm4.core.aggregation", "dm4.core.child", "dm4.core.parent", KiezatlasService.GEO_OBJECT);
            log.info("> Fetched " + einrichtungen.size() + " Einrichtungen in Bezirksregion: " + bezirksregion.getSimpleValue());
            for (Topic einrichtung : einrichtungen) {
                Association assoc = einrichtung.getAssociation("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child", bezirksregion.getId());
                if (assoc != null) {
                    workspaces.assignToWorkspace(assoc, kiezatlasWs.getId());
                    log.info("Creating workspace assignment for facet aggregation between  "+einrichtung.getSimpleValue() + " and \""
                        + bezirksregion.getSimpleValue() + "\"");
                } else {
                    log.warning("Could not find assoct between " + einrichtung.getId() + " and Bezirksregion: " + bezirksregion.getSimpleValue());
                }
            }
        }
        log.info("### Migration 15 COMPLETED: Assigned all Bezirksregionen Namen to workpsace \""+kiezatlasWs.getSimpleValue()+"\" "
                + "places without a bezirksregion assignment");
    }

}
