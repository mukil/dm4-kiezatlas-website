package de.kiezatlas.website.migrations;

import de.deepamehta.accesscontrol.AccessControlService;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.service.accesscontrol.SharingMode;
import de.deepamehta.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.DELETION_WORKSPACE_NAME;
import static de.kiezatlas.website.WebsiteService.DELETION_WORKSPACE_URI;
import java.util.logging.Logger;

/**
 *
 * @author malted
 */
public class Migration16 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaces;
    @Inject private AccessControlService accessControlService;

    @Override
    public void run() {
        log.info("### Migration 16 STARTED: Create \"Deletion\" workspace");
        Topic deletionWs = workspaces.createWorkspace(DELETION_WORKSPACE_NAME, DELETION_WORKSPACE_URI,
                SharingMode.COLLABORATIVE);
        accessControlService.setWorkspaceOwner(deletionWs, AccessControlService.ADMIN_USERNAME);
        log.info("### Migration 16 COMPLETED: Created new workspace " + deletionWs);
    }

}
