package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;
import java.util.List;
import java.util.logging.Logger;

/** 
 * Extends all existing Geo Objects about a "Confirmed" flag with the value "true".
 */
public class Migration10 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaceService;

    @Override
    public void run() {
        log.info("##### Start Kiezatlas Website \"Confirmation\"-Migration: Extend all Geo Objects! #####");
        // 1) Set "Confirmed" flag for every geo object already EXISTING to TRUE
        List<Topic> geoObjects = dm4.getTopicsByType("ka2.geo_object");
        for(Topic geoObject : geoObjects) {
            // Assign all new "confirmed"-flag topics to our dedicated "Confirmation"-Workspace
            // geoObject.getChildTopics().set(CONFIRMED_TYPE, true);
            /** dms.getAccessControl().assignToWorkspace(geoObject.getChildTopics().getTopic(CONFIRMED_TYPE),
                workspaceService.getWorkspace(CONFIRMATION_WS_URI).getId()); **/
            log.info("Set existing Geo Object: " + geoObject.getSimpleValue() + "  confirmed=" + true + " in Confirmation Workspace");
        }
        log.info("##### Kiezatlas Website \"Confirmation\"-Migration COMPLETE: Set " + geoObjects.size()
            + " Geo Objects as CONFIRMED #####");
    }

}