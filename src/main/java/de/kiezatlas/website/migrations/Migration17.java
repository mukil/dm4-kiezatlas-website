package de.kiezatlas.website.migrations;

import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.website.WebsiteService;
import java.util.List;
import java.util.logging.Logger;

/**
 *
 * @author malted
 */
public class Migration17 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());


    @Inject private WorkspacesService workspaces;

    @Override
    public void run() {
        log.info("### Migration 17 Started: Move all User Assignment Associations into Confirmation Workspace");
        // Fetch all existing user assignment edges
        Topic confirmationWs = workspaces.getWorkspace(WebsiteService.CONFIRMATION_WS_URI);
        List<Association> assignments = dm4.getAssociationsByType(WebsiteService.USER_ASSIGNMENT);
        // Create bezirksregion name facet assignment to all geo objects
        for (Association assignment : assignments) {
            workspaces.assignToWorkspace(assignment, confirmationWs.getId());
        }
        log.info("### Migration 17 COMPLETED: Assigned all User Assignment Associations into Confirmation Workspace");
    }

}
