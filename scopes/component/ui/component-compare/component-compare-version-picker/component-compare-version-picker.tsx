import React, { HTMLAttributes, useContext, useMemo } from 'react';
import compact from 'lodash.compact';
import { LegacyComponentLog } from '@teambit/legacy-component-log';
import { DropdownComponentVersion, VersionDropdown } from '@teambit/component.ui.version-dropdown';
import {
  useComponentCompareContext,
  useComponentCompareParams,
  getComponentCompareUrl,
} from '@teambit/component.ui.component-compare';
import { ComponentContext } from '@teambit/component';
import { useLocation } from '@teambit/base-ui.routing.routing-provider';
import classNames from 'classnames';
import styles from './component-compare-version-picker.module.scss';

export type ComponentCompareVersionPickerProps = { host: string } & HTMLAttributes<HTMLDivElement>;

export function ComponentCompareVersionPicker({ host }: ComponentCompareVersionPickerProps) {
  const component = useContext(ComponentContext);
  const componentCompare = useComponentCompareContext();
  const location = useLocation();

  const snaps: DropdownComponentVersion[] = useMemo(() => {
    const logs = component?.logs;
    return (logs || [])
      .filter((log) => !log.tag)
      .map((snap) => ({ ...snap, version: snap.hash }))
      .reverse();
  }, [component?.logs]);

  const tags: DropdownComponentVersion[] = useMemo(() => {
    const tagLookup = new Map<string, LegacyComponentLog>();
    const logs = component?.logs;

    (logs || [])
      .filter((log) => log.tag)
      .forEach((tag) => {
        tagLookup.set(tag?.tag as string, tag);
      });
    return compact(
      component?.tags
        ?.toArray()
        .reverse()
        .map((tag) => tagLookup.get(tag.version.version))
    ).map((tag) => ({ ...tag, version: tag.tag as string }));
  }, [component?.logs]);

  const isNew = snaps.length === 0 && tags.length === 0;

  const isWorkspace = host === 'teambit.workspace/workspace';

  const compareVersion =
    isWorkspace && !isNew && !location.search.includes('version') ? 'workspace' : componentCompare?.compare.version;

  const baseVersion = componentCompare?.base?.version;
  
  const key = `base-compare-version-dropdown-${
    componentCompare && !componentCompare.loading ? componentCompare.compare.id.toString() : componentCompare?.loading
  }`;

  return (
    <div className={styles.componentCompareVersionPicker}>
      <VersionDropdown
        key={key}
        className={classNames(styles.componentCompareVersionContainer, styles.left)}
        dropdownClassName={styles.componentCompareDropdown}
        placeholderClassName={styles.componentCompareVersionPlaceholder}
        menuClassName={classNames(styles.componentCompareVersionMenu, styles.showMenuOverNav)}
        snaps={snaps}
        tags={tags}
        currentVersion={baseVersion as string}
        loading={componentCompare?.loading}
        overrideVersionHref={(_baseVersion) => {
          const compareQueryParams = useComponentCompareParams();
          return getComponentCompareUrl({ ...compareQueryParams, baseVersion: _baseVersion });
        }}
        showVersionDetails={true}
      />
      <div className={styles.arrowContainer}>
        <img src="https://static.bit.dev/bit-icons/arrow-left.svg" />
      </div>
      <VersionDropdown
        className={classNames(styles.componentCompareVersionContainer, styles.right)}
        dropdownClassName={styles.componentCompareDropdown}
        placeholderClassName={styles.componentCompareVersionPlaceholder}
        menuClassName={styles.componentCompareVersionMenu}
        snaps={snaps}
        tags={tags}
        disabled={true}
        loading={componentCompare?.loading}
        currentVersion={compareVersion as string}
        showVersionDetails={true}
      />
    </div>
  );
}